import type { Json, JourneyStep } from '../contracts';
import { requiredValue, pointerRead, type ValueContext } from './variables';
export function bindBody(
  template: Json,
  bindings: JourneyStep['bodyBindings'],
  context: ValueContext,
): Json {
  const paths = bindings.map((b) => b.pointer);
  for (let i = 0; i < paths.length; i++)
    for (let j = i + 1; j < paths.length; j++) {
      const a = paths[i]!,
        b = paths[j]!;
      if (
        a === b ||
        a === '' ||
        b === '' ||
        a.startsWith(b + '/') ||
        b.startsWith(a + '/')
      )
        throw new Error('AMBIGUOUS BODY BINDINGS');
    }
  let body = structuredClone(template);
  for (const binding of bindings) {
    const value = requiredValue(binding.value, context);
    if (binding.pointer === '') {
      body = value;
      continue;
    }
    if (pointerRead(body, binding.pointer).kind !== 'value')
      throw new Error('INVALID BODY POINTER');
    const parts = binding.pointer
      .slice(1)
      .split('/')
      .map((p) => p.replaceAll('~1', '/').replaceAll('~0', '~'));
    let target = body;
    for (const key of parts.slice(0, -1)) {
      if (!target || typeof target !== 'object')
        throw new Error('INVALID BODY POINTER');
      target = (target as Record<string, Json>)[key]!;
    }
    if (!target || typeof target !== 'object')
      throw new Error('INVALID BODY POINTER');
    (target as Record<string, Json>)[parts.at(-1)!] = value;
  }
  return body;
}
