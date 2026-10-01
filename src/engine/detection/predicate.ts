import { createHash } from 'node:crypto';
import type { Json, Predicate } from '../contracts';
import { resolveOperand, type ValueContext } from '../execution/variables';
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, v]) => JSON.stringify(key) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export function predicateHash(
  p: Pick<Predicate, 'applicability' | 'assertions'> | unknown,
) {
  const definition = p as Pick<Predicate, 'applicability' | 'assertions'>;
  return createHash('sha256')
    .update(
      canonical({
        applicability: definition.applicability,
        assertions: definition.assertions,
      }),
    )
    .digest('hex');
}
function conjunction(
  comparisons: Predicate['assertions'],
  context: ValueContext,
): 'SATISFIED' | 'VIOLATED' | 'UNEVALUABLE' {
  let violated = false,
    missing = false;
  for (const comparison of comparisons) {
    const left = resolveOperand(comparison.left, context);
    if (left.kind === 'unavailable') {
      missing = true;
      continue;
    }
    if (comparison.op === 'exists' || comparison.op === 'absent') {
      if ((left.kind === 'value') !== (comparison.op === 'exists'))
        violated = true;
      continue;
    }
    const right = comparison.right
      ? resolveOperand(comparison.right, context)
      : { kind: 'unavailable' as const };
    if (left.kind !== 'value' || right.kind !== 'value') {
      missing = true;
      continue;
    }
    if (comparison.op === 'before') {
      if (typeof left.value !== 'number' || typeof right.value !== 'number') missing = true;
      else if (left.value >= right.value) violated = true;
      continue;
    }
    const equals = canonical(left.value) === canonical(right.value);
    if (
      comparison.op === 'equals'
        ? !equals
        : comparison.op === 'not-equals'
          ? equals
          : !Array.isArray(right.value) ||
            !right.value.some(
              (v: Json) => canonical(v) === canonical(left.value),
            )
    )
      violated = true;
  }
  return missing ? 'UNEVALUABLE' : violated ? 'VIOLATED' : 'SATISFIED';
}
export function evaluatePredicate(predicate: Predicate, context: ValueContext) {
  const applicability = conjunction(predicate.applicability, context);
  if (applicability === 'UNEVALUABLE') return applicability;
  if (applicability === 'VIOLATED') return 'NOT APPLICABLE' as const;
  return conjunction(predicate.assertions, context);
}
