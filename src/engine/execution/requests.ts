import type { JourneyStep, Json } from '../contracts';
import { requiredValue, type ValueContext } from './variables';
import { bindBody } from './bindings';
export function requestInput(step: JourneyStep, context: ValueContext) {
  const path: Record<string, Json> = {},
    query: Record<string, Json> = {},
    headers: Record<string, Json> = {};
  for (const p of step.parameters) {
    if (['__proto__', 'constructor', 'prototype'].includes(p.name))
      throw new Error('INVALID PARAMETER NAME');
    const value = requiredValue(p.value, context);
    if (p.location === 'header') {
      headers[p.name.toLowerCase()] = value;
    } else (p.location === 'path' ? path : query)[p.name] = value;
  }
  const body =
    step.body === undefined
      ? undefined
      : bindBody(step.body, step.bodyBindings, context);
  if (step.body === undefined && step.bodyBindings.length)
    throw new Error('MISSING BODY');
  return { path, query, headers, ...(body === undefined ? {} : { body }) };
}
