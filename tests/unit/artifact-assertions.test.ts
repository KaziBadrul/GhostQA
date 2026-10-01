import { expect, test } from 'vitest';
import {
  assertionEvaluations,
  intendedAssertionReproduced,
} from '../../src/engine/exports/assertions';
import { observedValues } from '../../src/engine/minimization/greedy';
import { exportCase } from '../helpers/artifact';

for (const verdict of [
  'VIOLATED',
  'SATISFIED',
  'NOT APPLICABLE',
  'UNEVALUABLE',
] as const)
  test(`artifact preservation requires exact intended assertion and ${verdict}`, async () => {
    const c = await exportCase(),
      trial = c.minimization.attempts.at(-1)!;
    const values = observedValues(c.minimization.best, trial.observations);
    const before = structuredClone(c.run.predicates[0]);
    try {
      const evaluations = assertionEvaluations(c.run.predicates[0]!, values),
        intended = evaluations.map((e) => e.assertionId);
      expect(intendedAssertionReproduced(verdict, intended, evaluations)).toBe(
        verdict === 'VIOLATED',
      );
      expect(c.run.predicates[0]).toEqual(before);
    } finally {
      values.vault.discard();
    }
  });
for (const component of ['id', 'version', 'hash', 'index'] as const)
  test(`different assertion ${component} cannot borrow a VIOLATED verdict`, async () => {
    const c = await exportCase(),
      p = c.run.predicates[0]!,
      trial = c.minimization.attempts.at(-1)!;
    const values = observedValues(c.minimization.best, trial.observations);
    try {
      const evaluations = assertionEvaluations(p, values),
        before = structuredClone(p);
      const intended = evaluations[0]!.assertionId.split(':');
      intended[
        component === 'id'
          ? 0
          : component === 'version'
            ? 1
            : component === 'hash'
              ? 2
              : 4
      ] = 'different';
      expect(
        intendedAssertionReproduced(
          'VIOLATED',
          [intended.join(':')],
          evaluations,
        ),
      ).toBe(false);
      expect(p).toEqual(before);
    } finally {
      values.vault.discard();
    }
  });
test('a different failed assertion of the SAME predicate cannot verify the intended failure', async () => {
  const c = await exportCase(),
    p = c.run.predicates[0]!,
    values = observedValues(
      c.minimization.best,
      c.minimization.attempts.at(-1)!.observations,
    );
  try {
    const intended = assertionEvaluations(p, values)[0]!;
    expect(
      intendedAssertionReproduced(
        'VIOLATED',
        [intended.assertionId],
        [
          {
            ...intended,
            assertionId: intended.assertionId.replace(/:0$/, ':1'),
          },
        ],
      ),
    ).toBe(false);
    expect(
      intendedAssertionReproduced(
        'VIOLATED',
        [intended.assertionId],
        [{ ...intended, outcome: 'SATISFIED' }],
      ),
    ).toBe(false);
    expect(intendedAssertionReproduced('VIOLATED', [], [intended])).toBe(false);
  } finally {
    values.vault.discard();
  }
});
