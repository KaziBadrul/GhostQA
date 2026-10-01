import { evaluatePredicate } from '../detection/predicate';
import type { Predicate } from '../contracts';
import type { ValueContext } from '../execution/variables';
import { AssertionEvaluationSchema } from './contracts';
export function assertionEvaluations(
  predicate: Predicate,
  values: ValueContext,
) {
  return predicate.assertions.map((assertion, index) =>
    AssertionEvaluationSchema.parse({
      assertionId: `${predicate.id}:${predicate.version}:${predicate.canonicalHash}:assertion:${index}`,
      // A transient evaluator view; approved predicate/identity is never edited.
      outcome: evaluatePredicate(
        { ...predicate, assertions: [assertion] },
        values,
      ),
    }),
  );
}
export function intendedAssertionReproduced(
  verdict: ReturnType<typeof evaluatePredicate>,
  intended: readonly string[],
  evaluations: ReturnType<typeof assertionEvaluations>,
) {
  return (
    verdict === 'VIOLATED' &&
    intended.length > 0 &&
    evaluations.some(
      (e) => e.outcome === 'VIOLATED' && intended.includes(e.assertionId),
    )
  );
}
