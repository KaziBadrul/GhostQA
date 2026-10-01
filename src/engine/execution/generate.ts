import { randomUUID } from 'node:crypto';
import type { Json } from '../contracts';
import { pointer, record } from '../openapi/references';
import { schemaProblem } from '../openapi/profile';
import { validInput } from '../openapi/schemas';

// These hints choose bounded candidates only. Ajv validates the unchanged schema.
function branches(
  schema: Json,
  root: Json,
  seen = new Set<string>(),
): Record<string, Json>[] {
  const value = record(schema);
  if (typeof value.$ref !== 'string') return [value];
  if (!value.$ref.startsWith('#/') || seen.has(value.$ref))
    throw new Error('UNSUPPORTED GENERATION');
  const target = pointer(root, value.$ref.slice(1));
  if (target === undefined) throw new Error('UNSUPPORTED GENERATION');
  return [value, ...branches(target, root, new Set([...seen, value.$ref]))];
}
function candidate(schemas: Json[], root: Json, depth = 0): Json {
  if (depth > 10) throw new Error('UNSUPPORTED GENERATION');
  const hints = schemas.flatMap((schema) => branches(schema, root));
  const declared = hints.find((s) => s.type !== undefined)?.type;
  const type = Array.isArray(declared)
    ? declared.find((t) => t !== 'null')
    : declared;
  const enumeration = hints.find((s) => Array.isArray(s.enum))?.enum;
  // Filter enum candidates with local hints; final validation retains the full reference closure.
  const accepts = (value: Json) =>
    validInput(
      {
        allOf: hints.map((branch) =>
          Object.fromEntries(
            Object.entries(branch).filter(([key]) => key !== '$ref'),
          ),
        ),
      },
      value,
    );
  if (Array.isArray(enumeration)) {
    for (const value of enumeration)
      if (accepts(value)) return structuredClone(value);
    throw new Error('INVALID GENERATION');
  }
  if (type === 'null') return null;
  if (type === 'boolean') return false;
  if (type === 'string') {
    const length = Math.max(0, ...hints.map((s) => Number(s.minLength ?? 0)));
    if (length > 256) throw new Error('INVALID GENERATION');
    const format = hints.find((s) => s.format)?.format;
    return format === 'email'
      ? `g-${randomUUID()}@example.test`
      : format === 'uuid'
        ? randomUUID()
        : 'x'.repeat(length);
  }
  if (type === 'number' || type === 'integer') {
    let lower = Math.max(
      -1000000,
      ...hints.map((s) => Number(s.minimum ?? -1000000)),
    );
    let upper = Math.min(
      1000000,
      ...hints.map((s) => Number(s.maximum ?? 1000000)),
    );
    for (const s of hints) {
      if (typeof s.exclusiveMinimum === 'number')
        lower = Math.max(
          lower,
          type === 'integer'
            ? Math.floor(s.exclusiveMinimum) + 1
            : s.exclusiveMinimum +
                Math.max(
                  Number.EPSILON,
                  Math.abs(s.exclusiveMinimum) * Number.EPSILON,
                ),
        );
      if (typeof s.exclusiveMaximum === 'number')
        upper = Math.min(
          upper,
          type === 'integer'
            ? Math.ceil(s.exclusiveMaximum) - 1
            : s.exclusiveMaximum -
                Math.max(
                  Number.EPSILON,
                  Math.abs(s.exclusiveMaximum) * Number.EPSILON,
                ),
        );
    }
    if (type === 'integer') {
      lower = Math.ceil(lower);
      upper = Math.floor(upper);
    }
    let value = Math.max(lower, Math.min(0, upper));
    for (const s of hints)
      if (typeof s.multipleOf === 'number')
        value = Math.ceil(value / s.multipleOf) * s.multipleOf;
    if (!Number.isFinite(value) || value > upper)
      throw new Error('INVALID GENERATION');
    return value;
  }
  if (type === 'array') {
    const size = Math.max(0, ...hints.map((s) => Number(s.minItems ?? 0)));
    if (size > 20) throw new Error('INVALID GENERATION');
    const items = hints.flatMap((s) =>
      s.items === undefined ? [] : [s.items],
    );
    return Array.from({ length: size }, () =>
      candidate(items, root, depth + 1),
    );
  }
  if (type === 'object') {
    const result: Record<string, Json> = {};
    const names = new Set(
      hints.flatMap((s) => (Array.isArray(s.required) ? s.required : [])),
    );
    for (const name of names) {
      if (
        typeof name !== 'string' ||
        ['__proto__', 'constructor', 'prototype'].includes(name)
      )
        throw new Error('INVALID GENERATION');
      const properties = hints.flatMap((s) =>
        Object.hasOwn(record(s.properties), name)
          ? [record(s.properties)[name]!]
          : [],
      );
      result[name] = candidate(properties, root, depth + 1);
    }
    return result;
  }
  throw new Error('UNSUPPORTED GENERATION');
}
export function generateValue(
  generator: 'email' | 'uuid' | 'bounded-literal',
  constraints: Json,
): Json {
  const root = record(constraints);
  const selected =
    typeof root.$ref === 'string' &&
    ['#/$defs/ghostqaSelected', '#/definitions/ghostqaSelected'].includes(
      root.$ref,
    )
      ? pointer(constraints, root.$ref.slice(1))
      : constraints;
  if (selected === undefined || schemaProblem(selected, 0, constraints))
    throw new Error('UNSUPPORTED GENERATION');
  const value =
    generator === 'email'
      ? `g-${randomUUID()}@example.test`
      : generator === 'uuid'
        ? randomUUID()
        : candidate([selected], constraints);
  if (!validInput(constraints, value)) throw new Error('INVALID GENERATION');
  return value;
}
