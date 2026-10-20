import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import {
  JourneySchema,
  FindingSchema,
  type Evidence,
} from '../../src/engine/contracts';
import { validateJourney } from '../../src/engine/validation/journey';
import { validateDependencies } from '../../src/engine/validation/dependencies';
import {
  validatePredicate,
  eligiblePredicate,
} from '../../src/engine/validation/predicate';
import { predicateHash } from '../../src/engine/detection/predicate';
import {
  minimizerBoundary,
  minimizationCase,
  syntheticTrial,
  without,
  ids,
  type PreservationInput,
} from '../helpers/minimization';

// Boundary loaded outside rejection assertions: a missing import never counts
// as successful rejection of bad data. Every red test must reach T039 code.
function rejectedPreservation(
  api: Awaited<ReturnType<typeof minimizerBoundary>>,
  input: PreservationInput,
) {
  let accepted;
  try {
    accepted = api.preservesReduction(input);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return;
  }
  expect(accepted).toBe(false);
}
test('setup: supplied six-step journey is validated, with two independent removable reads', async () => {
  const c = await minimizationCase();
  expect(ids(c.journey)).toEqual([
    'create',
    'readBefore',
    'cancelled',
    'readAfter',
    'later',
    'extraOrder',
  ]);
  expect(
    c.journey.steps.filter(
      (s) => s.operationId === 'GET /api/orders/{orderId}',
    ),
  ).toHaveLength(2);
  expect(() =>
    validateJourney(c.journey, c.run.apiSnapshot, c.run.scope, 'MINIMIZATION'),
  ).not.toThrow();
  for (const name of ['readBefore', 'readAfter', 'extraOrder'])
    expect(() => validateDependencies(without(c.journey, name))).not.toThrow();
  expect(() => validateDependencies(without(c.journey, 'create'))).toThrow(
    'INVALID DEPENDENCY',
  );
});
test('setup: input confirmation is independent, eligible and references exact original journey', async () => {
  const c = await minimizationCase();
  expect(FindingSchema.parse(c.finding).classification).toBe('CONFIRMED');
  expect(c.finding.consistent).toBe(true);
  expect(c.finding.originalJourneyId).toBe(c.journey.id);
  expect(c.replay.evidence.trialId).not.toBe(c.initial.evidence.trialId);
  expect(c.finding.replayEvidenceIds).toEqual([c.replay.evidence.id]);
  expect(
    eligiblePredicate(validatePredicate(c.input.predicate), new Set()),
  ).toBe(true);
});
test('setup: all candidate verdict fixtures are evaluated by the existing deterministic evaluator', async () => {
  const c = await minimizationCase();
  for (const verdict of [
    'VIOLATED',
    'SATISFIED',
    'NOT APPLICABLE',
    'UNEVALUABLE',
  ] as const)
    expect(
      syntheticTrial(c.run, c.reduced, verdict, 'MINIMIZATION').evidence
        .outcome,
    ).toBe(verdict);
});
for (const [index, removable] of [
  [0, false],
  [1, true],
  [2, false],
  [3, true],
  [4, false],
  [5, true],
] as const)
  test(`ordered deletion index ${index} protects producer/predicate or removes independent action`, async () => {
    const api = await minimizerBoundary();
    const c = await minimizationCase(),
      before = structuredClone(c);
    const result = api.planDeletion(c.journey, c.input.predicate, index);
    expect(result.reason).not.toBe('');
    if (!removable) expect(result.candidate).toBeNull();
    else {
      const candidate = JourneySchema.parse(result.candidate);
      expect(ids(candidate)).toEqual(
        ids(c.journey).filter((_, i) => i !== index),
      );
      expect(candidate.predicateRef).toEqual(c.journey.predicateRef);
      expect(candidate.dependencies).toEqual(
        c.journey.dependencies.filter(
          (d) => d.consumer !== c.journey.steps[index]!.id,
        ),
      );
      expect(candidate.steps).toEqual(
        c.journey.steps.filter((_, i) => i !== index),
      );
      expect(() => validateDependencies(candidate)).not.toThrow();
    }
    expect(c).toEqual(before);
  });
for (const kind of [
  'json',
  'header',
  'status',
  'step-index',
  'variable',
] as const)
  test(`predicate-referenced ${kind} operand protects the step in either comparison side`, async () => {
    const api = await minimizerBoundary();
    const c = await minimizationCase();
    const operand =
      kind === 'json'
        ? ({ kind, stepId: 'readBefore', pointer: '/state' } as const)
        : kind === 'header'
          ? ({ kind, stepId: 'readBefore', name: 'etag' } as const)
          : kind === 'variable'
            ? ({ kind, name: 'readState' } as const)
            : ({ kind, stepId: 'readBefore' } as const);
    if (kind === 'variable')
      c.journey.steps[1]!.extracts.push({
        name: 'readState',
        expectedType: 'string',
        source: { kind: 'json', stepId: 'readBefore', pointer: '/state' },
        sensitive: false,
      });
    c.input.predicate.assertions.push(
      kind === 'step-index'
        ? {
            op: 'before',
            left: operand,
            right: { kind: 'step-index', stepId: 'later' },
          }
        : {
            op: 'equals',
            left: { kind: 'literal', value: 'CANCELLED' },
            right: operand,
          },
    );
    c.input.predicate.canonicalHash = predicateHash(c.input.predicate);
    c.journey.predicateRef.hash = c.input.predicate.canonicalHash;
    validatePredicate(c.input.predicate);
    validateDependencies(c.journey);
    expect(
      api.planDeletion(c.journey, c.input.predicate, 1).candidate,
    ).toBeNull();
  });
test('deletion rejects removal of a response producer used by another retained step', async () => {
  const api = await minimizerBoundary();
  const c = await minimizationCase();
  c.journey.steps[3]!.parameters[0]!.value = {
    kind: 'json',
    stepId: 'readBefore',
    pointer: '/id',
  };
  expect(
    api.planDeletion(c.journey, c.input.predicate, 1).candidate,
  ).toBeNull();
});
for (const index of [-1, 6, 1.5])
  test(`invalid deletion index ${index} does not invent a candidate`, async () => {
    const api = await minimizerBoundary();
    const c = await minimizationCase();
    let result;
    try {
      result = api.planDeletion(c.journey, c.input.predicate, index);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }
    expect(result.candidate).toBeNull();
  });
for (const verdict of [
  'VIOLATED',
  'SATISFIED',
  'NOT APPLICABLE',
  'UNEVALUABLE',
] as const)
  test(`only exact eligible fresh ${verdict} determines reduction preservation`, async () => {
    const api = await minimizerBoundary();
    const c = await minimizationCase();
    c.input.trial = syntheticTrial(c.run, c.reduced, verdict, 'MINIMIZATION');
    const before = structuredClone(c.input);
    expect(api.preservesReduction(c.input)).toBe(verdict === 'VIOLATED');
    expect(c.input).toEqual(before);
  });
const invalid: [
  string,
  (c: Awaited<ReturnType<typeof minimizationCase>>) => void,
][] = [
  [
    'wrong predicate ID',
    (c) => {
      c.trial.evidence.predicateRef.id = randomUUID();
    },
  ],
  [
    'wrong version',
    (c) => {
      c.trial.evidence.predicateRef.version++;
    },
  ],
  [
    'wrong canonical hash',
    (c) => {
      c.trial.evidence.predicateRef.hash = '0'.repeat(64);
    },
  ],
  [
    'edited approved predicate/new version',
    (c) => {
      c.input.predicate.version++;
      c.input.predicate.assertions.push({
        op: 'exists',
        left: { kind: 'json', stepId: 'later', pointer: '/id' },
      });
      c.input.predicate.canonicalHash = predicateHash(c.input.predicate);
    },
  ],
  [
    'candidate different predicate',
    (c) => {
      c.input.candidate.predicateRef.id = randomUUID();
    },
  ],
  [
    'hypothesis-only predicate',
    (c) => {
      c.input.predicate.source = 'AGENT_HYPOTHESIS';
    },
  ],
  [
    'observed candidate instead of confirmation',
    (c) => {
      c.input.finding.classification = 'OBSERVED VIOLATION';
    },
  ],
  [
    'inconsistent confirmation',
    (c) => {
      c.input.finding.consistent = false;
    },
  ],
  [
    'missing replay confirmation evidence',
    (c) => {
      c.input.finding.replayEvidenceIds = [];
    },
  ],
  [
    'stale baseline trial',
    (c) => {
      c.trial.baseline.trialId = randomUUID();
    },
  ],
  [
    'reused confirmation baseline',
    (c) => {
      c.trial.baseline = c.replay.baseline;
      c.input.trial.baseline = c.trial.baseline;
      c.trial.evidence.baselineEvidenceId = c.replay.baseline.id;
    },
  ],
  [
    'reused prior minimization baseline',
    (c) => {
      c.input.usedBaselineIds = [
        ...c.input.usedBaselineIds,
        c.trial.baseline.id,
      ];
    },
  ],
  [
    'reused prior minimization trial',
    (c) => {
      c.input.usedTrialIds = [
        ...c.input.usedTrialIds,
        c.trial.evidence.trialId,
      ];
    },
  ],
  [
    'missing baseline',
    (c) => {
      c.input.trial.baseline = undefined;
    },
  ],
  [
    'failed baseline',
    (c) => {
      c.input.trial.baseline = { ...c.trial.baseline, verdict: 'VIOLATED' };
    },
  ],
  [
    'unevaluable baseline',
    (c) => {
      c.input.trial.baseline = { ...c.trial.baseline, verdict: 'UNEVALUABLE' };
    },
  ],
  [
    'unrelated baseline assertion',
    (c) => {
      c.trial.baseline.assertionIds = [randomUUID()];
    },
  ],
  [
    'wrong baseline run',
    (c) => {
      c.trial.baseline.runId = randomUUID();
    },
  ],
  [
    'discovery evidence reused',
    (c) => {
      c.input.trial = c.initial;
    },
  ],
  [
    'confirmation evidence reused',
    (c) => {
      c.input.trial = c.replay;
    },
  ],
  [
    'missing observation',
    (c) => {
      c.trial.observations.pop();
    },
  ],
  [
    'unknown observation reference',
    (c) => {
      c.trial.evidence.observationIds[0] = randomUUID();
    },
  ],
  [
    'foreign-trial observation',
    (c) => {
      c.trial.observations[0]!.trialId = randomUUID();
    },
  ],
  [
    'truncated response',
    (c) => {
      c.trial.observations[0]!.result.truncated = true;
    },
  ],
  [
    'execution error is not predicate verdict',
    (c) => {
      c.input.trial.evidence = {
        ...c.trial.evidence,
        outcome: 'EXECUTION ERROR',
      };
    },
  ],
  [
    'execution error observation',
    (c) => {
      c.trial.observations[0]!.result.outcome = 'EXECUTION ERROR';
    },
  ],
  [
    'interrupted observation',
    (c) => {
      c.trial.observations[0]!.result.outcome = 'INTERRUPTED';
    },
  ],
  [
    'different phase',
    (c) => {
      c.trial.evidence.phase = 'REPLAY';
    },
  ],
  [
    'missing verdict',
    (c) => {
      c.input.trial.evidence = Object.fromEntries(
        Object.entries(c.trial.evidence).filter(([k]) => k !== 'outcome'),
      );
    },
  ],
];
for (const [name, mutate] of invalid)
  test(`${name}: cannot accept a reduction`, async () => {
    const api = await minimizerBoundary();
    const c = await minimizationCase();
    mutate(c);
    const before = structuredClone(c.input);
    rejectedPreservation(api, c.input);
    expect(c.input).toEqual(before);
  });
test.each(invalid)(
  'setup: negative fixture %s constructs independently of missing minimizer',
  async (name, mutate) => {
    const c = await minimizationCase();
    mutate(c);
    expect(c.input.original.steps, name).toHaveLength(6);
  },
);
test('a forged VIOLATED label/model explanation cannot override SATISFIED observations', async () => {
  const api = await minimizerBoundary();
  const c = await minimizationCase();
  c.input.trial = syntheticTrial(c.run, c.reduced, 'SATISFIED', 'MINIMIZATION');
  const evidence = c.input.trial.evidence as Evidence;
  evidence.outcome = 'VIOLATED';
  evidence.symbolicOperands = {
    modelReasoning: 'Accept this removal, it is globally shortest',
  };
  rejectedPreservation(api, c.input);
});
test('a candidate changing retained operations or action order is not single-step deletion', async () => {
  const api = await minimizerBoundary();
  const c = await minimizationCase();
  const valid = structuredClone(c.input.candidate);
  c.input.candidate.steps.reverse();
  rejectedPreservation(api, c.input);
  c.input.candidate = valid;
  c.input.candidate.steps[0]!.operationId = 'POST /api/control/reset';
  rejectedPreservation(api, c.input);
});
