import type { Json, Operand, StateVariable } from '../contracts';
import type { SecretVault } from '../secrets/vault';
import { generateValue } from './generate';
export interface StepValue {
  ordinal?: number;
  operationId?: string;
  request?: Json;
  status: number;
  body: Json | null;
  headers: Record<string, string>;
  truncated: boolean;
  text?: string;
}
export interface ValueContext {
  vault: SecretVault;
  results: Map<string, StepValue>;
  inputs: Record<string, Json>;
}
export type Selected =
  { kind: 'value'; value: Json } | { kind: 'absent' } | { kind: 'unavailable' };
export function pointerRead(root: Json, pointer: string): Selected {
  if (pointer === '') return { kind: 'value', value: root };
  if (!pointer.startsWith('/')) return { kind: 'unavailable' };
  let value = root;
  for (const encoded of pointer.slice(1).split('/')) {
    if (/~(?![01])/.test(encoded)) return { kind: 'unavailable' };
    const key = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
    if (['__proto__', 'constructor', 'prototype'].includes(key))
      return { kind: 'unavailable' };
    if (value === null || typeof value !== 'object')
      return { kind: 'unavailable' };
    if (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(key))
      return { kind: 'unavailable' };
    if (!Object.hasOwn(value, key)) return { kind: 'absent' };
    value = (value as Record<string, Json>)[key]!;
  }
  return { kind: 'value', value };
}
export function resolveOperand(operand: Operand, c: ValueContext): Selected {
  if (operand.kind === 'literal')
    return { kind: 'value', value: operand.value };
  if (operand.kind === 'variable') {
    try {
      return { kind: 'value', value: c.vault.get(operand.name) };
    } catch {
      return { kind: 'unavailable' };
    }
  }
  const step = c.results.get(operand.stepId);
  if (!step) return { kind: 'unavailable' };
  if (operand.kind === 'step-index') return step.ordinal === undefined ? { kind: 'unavailable' } : { kind: 'value', value: step.ordinal };
  if (operand.kind === 'operation') return step.operationId === undefined ? { kind: 'unavailable' } : { kind: 'value', value: step.operationId };
  if (operand.kind === 'request') return step.request === undefined ? { kind: 'unavailable' } : pointerRead(step.request, operand.pointer);
  if (operand.kind === 'status') return { kind: 'value', value: step.status };
  if (operand.kind === 'header') {
    const key = Object.keys(step.headers).find(
      (k) => k.toLowerCase() === operand.name.toLowerCase(),
    );
    return key
      ? { kind: 'value', value: step.headers[key]! }
      : { kind: 'absent' };
  }
  if (step.truncated || (step.body === null && step.text?.trim() !== 'null'))
    return { kind: 'unavailable' };
  return pointerRead(step.body, operand.pointer);
}
export function requiredValue(operand: Operand, c: ValueContext): Json {
  const result = resolveOperand(operand, c);
  if (result.kind !== 'value') throw new Error('MISSING VALUE');
  return result.value;
}
export function matchesType(value: Json, type: StateVariable['expectedType']) {
  return type === 'null'
    ? value === null
    : type === 'array'
      ? Array.isArray(value)
      : type === 'integer'
        ? Number.isInteger(value)
        : type === 'object'
          ? value !== null && typeof value === 'object' && !Array.isArray(value)
          : typeof value === type &&
            (type !== 'number' || Number.isFinite(value));
}
export function extract(variable: StateVariable, c: ValueContext) {
  const source = variable.source;
  const value =
    source.kind === 'input'
      ? Object.hasOwn(c.inputs, source.key) &&
        !['__proto__', 'constructor', 'prototype'].includes(source.key)
        ? c.inputs[source.key]
        : undefined
      : source.kind === 'generate'
        ? generateValue(source.generator, source.constraints)
        : requiredValue(source, c);
  if (value === undefined) throw new Error('MISSING VALUE');
  if (!matchesType(value, variable.expectedType))
    throw new Error('INVALID VALUE TYPE');
  const sensitive =
    variable.sensitive ||
    (source.kind === 'variable' && c.vault.isSensitive(source.name));
  c.vault.set(variable.name, value, sensitive);
}
