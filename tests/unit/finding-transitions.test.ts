import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { EvidenceSchema, FindingSchema } from '../../src/engine/contracts';
import { detectCandidate } from '../../src/engine/detection/candidates';
import { predicateHash } from '../../src/engine/detection/predicate';
import {
  findingBoundary,
  orderCase,
  orderEvidence,
  type VerificationInput,
} from '../helpers/verification';

const transition = z.object({
  prior: z.string().nullable(),
  next: z.string(),
  evidenceRefs: z.array(z.string()),
});
function appended(
  input: VerificationInput,
  result: unknown,
  classification: string,
) {
  const next = FindingSchema.parse(result);
  expect(next.classification).toBe(classification);
  expect(next.id).toBe(input.finding.id);
  expect(next.predicateRef).toEqual(input.finding.predicateRef);
  expect(next.initialEvidenceId).toBe(input.initial.evidence.id);
  expect(next.transitions.slice(0, input.finding.transitions.length)).toEqual(
    input.finding.transitions,
  );
  expect(next.transitions).toHaveLength(input.finding.transitions.length + 1);
  const last = transition.parse(next.transitions.at(-1));
  expect(last.prior).toBe(input.finding.classification);
  expect(last.next).toBe(classification);
  return next;
}
test('T035-derived evidence is valid and four verdict fixtures are deterministically evaluated', async () => {
  const c = await orderCase();
  expect(c.finding.classification).toBe('OBSERVED VIOLATION');
  expect(c.replay.baseline.id).not.toBe(c.initial.baseline.id);
  for (const outcome of [
    'VIOLATED',
    'SATISFIED',
    'NOT APPLICABLE',
    'UNEVALUABLE',
  ] as const)
    expect(
      orderEvidence(c.run, c.journey, outcome, 'REPLAY').evidence.outcome,
    ).toBe(outcome);
});
for (const [outcome, classification] of [
  ['VIOLATED', 'CONFIRMED'],
  ['SATISFIED', 'NON-REPRODUCED'],
  ['NOT APPLICABLE', 'INCONCLUSIVE'],
  ['UNEVALUABLE', 'INCONCLUSIVE'],
] as const)
  test(`fresh eligible replay ${outcome} => ${classification}`, async () => {
    const api = await findingBoundary(); // Loaded before assertions: missing code cannot satisfy a rejection.
    const c = await orderCase();
    c.input.replay = orderEvidence(c.run, c.journey, outcome, 'REPLAY');
    const before = structuredClone(c.finding);
    const next = appended(
      c.input,
      api.transitionFinding(c.input),
      classification,
    );
    const evidence = EvidenceSchema.parse(c.input.replay.evidence);
    expect(next.replayEvidenceIds).toEqual([evidence.id]);
    expect(transition.parse(next.transitions.at(-1)).evidenceRefs).toEqual([
      c.initial.evidence.id,
      evidence.id,
    ]);
    expect(next.consistent).toBe(true);
    expect(c.finding).toEqual(before);
  });
const invalidCases: [
  string,
  (c: Awaited<ReturnType<typeof orderCase>>) => void,
][] = [
  [
    'wrong predicate ID',
    (c) => {
      c.replay.evidence.predicateRef.id = randomUUID();
    },
  ],
  [
    'wrong version',
    (c) => {
      c.replay.evidence.predicateRef.version++;
    },
  ],
  [
    'wrong canonical hash',
    (c) => {
      c.replay.evidence.predicateRef.hash = '0'.repeat(64);
    },
  ],
  [
    'edited predicate/new version cannot verify old candidate',
    (c) => {
      c.input.predicate = structuredClone(c.input.predicate);
      c.input.predicate.version++;
      c.input.predicate.assertions[0]!.right = {
        kind: 'literal',
        value: 'CREATED',
      };
      c.input.predicate.canonicalHash = predicateHash(c.input.predicate);
      c.replay.evidence.predicateRef = {
        id: c.input.predicate.id,
        version: c.input.predicate.version,
        hash: c.input.predicate.canonicalHash,
      };
    },
  ],
  [
    'reused baseline',
    (c) => {
      c.replay.evidence.baselineEvidenceId = c.initial.baseline.id;
      c.input.replay.baseline = c.initial.baseline;
    },
  ],
  [
    'stale baseline trial',
    (c) => {
      c.replay.baseline.trialId = c.initial.evidence.trialId;
    },
  ],
  [
    'missing baseline',
    (c) => {
      c.input.replay.baseline = undefined;
    },
  ],
  [
    'violated baseline',
    (c) => {
      c.input.replay.baseline = { ...c.replay.baseline, verdict: 'VIOLATED' };
    },
  ],
  [
    'unevaluable baseline',
    (c) => {
      c.input.replay.baseline = {
        ...c.replay.baseline,
        verdict: 'UNEVALUABLE',
      };
    },
  ],
  [
    'empty baseline assertion references',
    (c) => {
      c.replay.baseline.assertionIds = [];
    },
  ],
  [
    'unrelated baseline assertion',
    (c) => {
      c.replay.baseline.assertionIds = [randomUUID()];
    },
  ],
  [
    'baseline from another run',
    (c) => {
      c.replay.baseline.runId = randomUUID();
    },
  ],
  [
    'discovery trial reused',
    (c) => {
      c.replay.evidence.trialId = c.initial.evidence.trialId;
      c.replay.baseline.trialId = c.initial.evidence.trialId;
      c.replay.observations.forEach(
        (o) => (o.trialId = c.initial.evidence.trialId),
      );
    },
  ],
  [
    'original discovery evidence cannot confirm itself',
    (c) => {
      c.input.replay = c.initial;
    },
  ],
  [
    'replay incorrectly classified as exploration',
    (c) => {
      c.replay.evidence.phase = 'EXPLORATION';
    },
  ],
  [
    'unknown observation reference',
    (c) => {
      c.replay.evidence.observationIds[0] = randomUUID();
    },
  ],
  [
    'duplicate observation reference',
    (c) => {
      c.replay.evidence.observationIds[1] =
        c.replay.evidence.observationIds[0]!;
    },
  ],
  [
    'observation from original trial',
    (c) => {
      c.replay.observations[0]!.trialId = c.initial.evidence.trialId;
    },
  ],
  [
    'missing observation',
    (c) => {
      c.replay.observations.pop();
    },
  ],
  [
    'execution error is not predicate verdict',
    (c) => {
      c.input.replay.evidence = {
        ...c.replay.evidence,
        outcome: 'EXECUTION ERROR',
      };
    },
  ],
  [
    'execution error observation cannot confirm',
    (c) => {
      c.replay.observations[2]!.result.outcome = 'EXECUTION ERROR';
    },
  ],
  [
    'interrupted observation cannot confirm',
    (c) => {
      c.replay.observations[2]!.result.outcome = 'INTERRUPTED';
    },
  ],
  [
    'truncated observation cannot confirm',
    (c) => {
      c.replay.observations[2]!.result.truncated = true;
    },
  ],
];
// The accepted contract permits rejection of malformed references or a recorded
// INCONCLUSIVE determination. Either must preserve the initial history/identity.
for (const [name, change] of invalidCases)
  test(`${name}: reject or INCONCLUSIVE, never a finding verdict from execution error`, async () => {
    const api = await findingBoundary();
    const c = await orderCase();
    change(c);
    const before = structuredClone(c.finding);
    let next;
    try {
      next = api.transitionFinding(c.input);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(c.finding).toEqual(before);
      return;
    }
    appended(c.input, next, 'INCONCLUSIVE');
    expect(c.finding).toEqual(before);
  });
for (const kind of [
  'hypothesis only',
  'late approval',
  'approval withdrawn',
  'ungrounded specification assertion',
] as const)
  test(`${kind} cannot manufacture confirmation from two violations`, async () => {
    const api = await findingBoundary();
    const c = await orderCase();
    c.input.predicate.source =
      kind === 'ungrounded specification assertion'
        ? 'SPEC_ASSERTION'
        : 'AGENT_HYPOTHESIS';
    c.input.predicate.sourceRef =
      kind === 'ungrounded specification assertion'
        ? 'openapi:enum:state'
        : 'model suggestion';
    c.input.predicate.approvalRef = randomUUID();
    if (kind === 'late approval')
      c.input.replayApprovals = new Set([c.input.predicate.approvalRef]);
    if (kind === 'approval withdrawn')
      c.input.initialApprovals = new Set([c.input.predicate.approvalRef]);
    c.input.finding = detectCandidate(
      c.run,
      c.journey,
      c.initial.evidence,
      c.initial.baseline,
      c.initial.observations,
      c.input.initialApprovals,
    )!;
    appended(c.input, api.transitionFinding(c.input), 'INCONCLUSIVE');
  });
test('approved hypothesis needs new bounded run and newly observed initial candidate', async () => {
  const api = await findingBoundary();
  const old = await orderCase();
  old.input.predicate.source = 'AGENT_HYPOTHESIS';
  old.input.predicate.approvalRef = randomUUID();
  old.input.finding = detectCandidate(
    old.run,
    old.journey,
    old.initial.evidence,
    old.initial.baseline,
    old.initial.observations,
  )!;
  old.input.replayApprovals = new Set([old.input.predicate.approvalRef]);
  appended(old.input, api.transitionFinding(old.input), 'INCONCLUSIVE');
  const c = await orderCase();
  expect(c.run.id).not.toBe(old.run.id);
  expect(c.initial.evidence.id).not.toBe(old.initial.evidence.id);
  c.run.projectId = old.run.projectId;
  c.run.predicates[0] = structuredClone(old.input.predicate);
  c.input.predicate = c.run.predicates[0]!;
  c.journey.predicateRef = { ...old.journey.predicateRef };
  c.input.initial = orderEvidence(c.run, c.journey, 'VIOLATED', 'EXPLORATION');
  c.input.replay = orderEvidence(c.run, c.journey, 'VIOLATED', 'REPLAY');
  c.input.initialApprovals = c.input.replayApprovals = new Set([
    c.input.predicate.approvalRef!,
  ]);
  c.input.finding = detectCandidate(
    c.run,
    c.journey,
    c.input.initial.evidence,
    c.input.initial.baseline,
    c.input.initial.observations,
    c.input.initialApprovals,
  )!;
  expect(c.input.finding.predicateRef).toEqual(old.finding.predicateRef);
  expect(old.input.finding.classification).toBe('INCONCLUSIVE');
  expect(c.input.finding.initialEvidenceId).not.toBe(
    old.input.finding.initialEvidenceId,
  );
  expect(c.input.finding.classification).toBe('OBSERVED VIOLATION');
  appended(c.input, api.transitionFinding(c.input), 'CONFIRMED');
});
test('new predicate version needs a new candidate, initial evidence and independent replay', async () => {
  const api = await findingBoundary();
  const c = await orderCase();
  c.input.predicate.version++;
  c.input.predicate.assertions.push({
    op: 'exists',
    left: { kind: 'json', stepId: 'create', pointer: '/id' },
  });
  c.input.predicate.canonicalHash = predicateHash(c.input.predicate);
  c.journey.predicateRef.version++;
  c.journey.predicateRef.hash = c.input.predicate.canonicalHash;
  c.input.initial = orderEvidence(c.run, c.journey, 'VIOLATED', 'EXPLORATION');
  c.input.replay = orderEvidence(c.run, c.journey, 'VIOLATED', 'REPLAY');
  c.input.finding = detectCandidate(
    c.run,
    c.journey,
    c.input.initial.evidence,
    c.input.initial.baseline,
    c.input.initial.observations,
  )!;
  expect(c.input.finding.id).not.toBe(c.finding.id);
  appended(c.input, api.transitionFinding(c.input), 'CONFIRMED');
});
for (const first of ['VIOLATED', 'SATISFIED'] as const)
  test(`later disagreement after ${first} appends evidence and marks inconsistent`, async () => {
    const api = await findingBoundary();
    const c = await orderCase();
    c.input.replay = orderEvidence(c.run, c.journey, first, 'REPLAY');
    const firstId = EvidenceSchema.parse(c.input.replay.evidence).id;
    const previous = api.transitionFinding(c.input);
    const history = structuredClone(previous);
    c.input.finding = previous;
    c.input.replay = orderEvidence(
      c.run,
      c.journey,
      first === 'VIOLATED' ? 'SATISFIED' : 'VIOLATED',
      'REPLAY',
    );
    const next = api.transitionFinding(c.input);
    expect(next.consistent).toBe(false);
    expect(next.transitions.slice(0, history.transitions.length)).toEqual(
      history.transitions,
    );
    expect(next.transitions).toHaveLength(history.transitions.length + 1);
    expect(next.replayEvidenceIds).toEqual([
      firstId,
      EvidenceSchema.parse(c.input.replay.evidence).id,
    ]);
    expect(previous).toEqual(history);
    c.input.finding = next;
    c.input.replay = orderEvidence(c.run, c.journey, 'VIOLATED', 'REPLAY');
    expect(api.transitionFinding(c.input).consistent).toBe(false); // Requires new initial + replay attempt.
  });
test('Gemini prose has no finding authority', async () => {
  const api = await findingBoundary();
  const c = await orderCase();
  c.input.replay = orderEvidence(c.run, c.journey, 'SATISFIED', 'REPLAY');
  c.input.replay.evidence = {
    ...EvidenceSchema.parse(c.input.replay.evidence),
    symbolicOperands: { modelReasoning: 'CONFIRMED' },
  };
  appended(c.input, api.transitionFinding(c.input), 'NON-REPRODUCED');
});

test('all negative-case fixtures are constructible independently of missing T037 code', async () => {
  for (const [name, change] of invalidCases) {
    const c = await orderCase();
    change(c);
    expect(c.input.finding.id, name).toBe(c.finding.id);
    expect(c.input.initial.evidence.outcome, name).toBe('VIOLATED');
  }
});
for (const initialOutcome of [
  'SATISFIED',
  'NOT APPLICABLE',
  'UNEVALUABLE',
] as const)
  test(`initial ${initialOutcome} cannot support confirmation`, async () => {
    const api = await findingBoundary();
    const c = await orderCase();
    c.input.initial = orderEvidence(
      c.run,
      c.journey,
      initialOutcome,
      'EXPLORATION',
    );
    c.input.finding.initialEvidenceId = c.input.initial.evidence.id;
    let next;
    try {
      next = api.transitionFinding(c.input);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }
    expect(next.classification).toBe('INCONCLUSIVE');
  });
for (const outcome of ['VIOLATED', 'SATISFIED'] as const)
  test(`later agreeing ${outcome} keeps append-only consistent history`, async () => {
    const api = await findingBoundary();
    const c = await orderCase();
    c.input.replay = orderEvidence(c.run, c.journey, outcome, 'REPLAY');
    c.input.finding = api.transitionFinding(c.input);
    const previous = structuredClone(c.input.finding);
    c.input.replay = orderEvidence(c.run, c.journey, outcome, 'REPLAY');
    const next = appended(
      c.input,
      api.transitionFinding(c.input),
      outcome === 'VIOLATED' ? 'CONFIRMED' : 'NON-REPRODUCED',
    );
    expect(next.consistent).toBe(true);
    expect(next.replayEvidenceIds).toEqual([
      ...previous.replayEvidenceIds,
      EvidenceSchema.parse(c.input.replay.evidence).id,
    ]);
  });
test('grounded specification provenance with exact trusted hash is eligible', async () => {
  const api = await findingBoundary();
  const c = await orderCase();
  c.input.predicate.source = 'SPEC_ASSERTION';
  c.input.predicate.sourceRef = 'openapi:enum:state';
  c.input.specificationAssertions = new Map([
    [c.input.predicate.sourceRef, c.input.predicate.canonicalHash],
  ]);
  c.input.finding = detectCandidate(
    c.run,
    c.journey,
    c.initial.evidence,
    c.initial.baseline,
    c.initial.observations,
    c.input.initialApprovals,
    c.input.specificationAssertions,
  )!;
  appended(c.input, api.transitionFinding(c.input), 'CONFIRMED');
});

test('missing replay verdict yields INCONCLUSIVE rather than an invented verdict', async () => {
  const api = await findingBoundary();
  const c = await orderCase();
  c.input.replay.evidence = Object.fromEntries(
    Object.entries(c.replay.evidence).filter(([key]) => key !== 'outcome'),
  );
  appended(c.input, api.transitionFinding(c.input), 'INCONCLUSIVE');
});
test('forged model classification cannot replace the deterministic SATISFIED verdict', async () => {
  const api = await findingBoundary();
  const c = await orderCase();
  c.input.replay = orderEvidence(c.run, c.journey, 'SATISFIED', 'REPLAY');
  c.input.replay.evidence = {
    ...EvidenceSchema.parse(c.input.replay.evidence),
    classification: 'CONFIRMED',
  };
  let next;
  try {
    next = api.transitionFinding(c.input);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return;
  }
  expect(next.classification).toBe('NON-REPRODUCED');
});

test('approved and edited-version initial fixtures pass existing strict candidate validation', async () => {
  const c = await orderCase();
  const predicate = c.run.predicates[0]!;
  predicate.source = 'AGENT_HYPOTHESIS';
  predicate.approvalRef = randomUUID();
  const approved = new Set([predicate.approvalRef]);
  expect(
    detectCandidate(
      c.run,
      c.journey,
      c.initial.evidence,
      c.initial.baseline,
      c.initial.observations,
      approved,
    )?.classification,
  ).toBe('OBSERVED VIOLATION');
  predicate.version++;
  predicate.assertions.push({
    op: 'exists',
    left: { kind: 'json', stepId: 'create', pointer: '/id' },
  });
  predicate.canonicalHash = predicateHash(predicate);
  c.journey.predicateRef = {
    id: predicate.id,
    version: predicate.version,
    hash: predicate.canonicalHash,
  };
  const newInitial = orderEvidence(c.run, c.journey, 'VIOLATED', 'EXPLORATION');
  const edited = detectCandidate(
    c.run,
    c.journey,
    newInitial.evidence,
    newInitial.baseline,
    newInitial.observations,
    approved,
  )!;
  expect(edited.classification).toBe('OBSERVED VIOLATION');
  expect(edited.id).not.toBe(c.finding.id);
  expect(edited.predicateRef.version).toBe(2);
  expect(edited.predicateRef.hash).not.toBe(c.finding.predicateRef.hash);
});
