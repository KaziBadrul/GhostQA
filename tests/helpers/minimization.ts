import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  BaselineEvidenceSchema,
  EvidenceSchema,
  FindingSchema,
  JourneySchema,
  ObservationSchema,
  type Journey,
  type Predicate,
  type Finding,
  type Run,
  type Evidence,
  type Observation,
  type Json,
} from '../../src/engine/contracts';
import { evaluatePredicate } from '../../src/engine/detection/predicate';
import { transitionFinding } from '../../src/engine/detection/findings';
import { detectCandidate } from '../../src/engine/detection/candidates';
import { SecretVault } from '../../src/engine/secrets/vault';
import type { ValueContext } from '../../src/engine/execution/variables';
import type { RunSupervisor } from '../../src/server/run-supervisor';
import { replayCandidate } from '../../src/engine/verification/replay';
import { orderCase, orderHarness } from './verification';

// T039 consumer ports only. No deletion algorithm or alternate HTTP path here.
export interface PreservationInput {
  run: Run;
  finding: Finding;
  original: Journey;
  candidate: Journey;
  predicate: Predicate;
  trial: { evidence: unknown; baseline: unknown; observations: Observation[] };
  usedTrialIds: readonly string[];
  usedBaselineIds: readonly string[];
  approvals: ReadonlySet<string>;
  specificationAssertions: ReadonlyMap<string, string>;
}
export const AttemptSchema = z.strictObject({
  candidate: JourneySchema,
  removedStepId: z.string(),
  accepted: z.boolean(),
  reason: z.string().min(1),
  trialId: z.uuid().optional(),
  baseline: BaselineEvidenceSchema.optional(),
  evidence: EvidenceSchema.optional(),
  observations: z.array(ObservationSchema),
  // Failures are run/trial outcomes, never predicate verdicts.
  executionOutcome: z
    .enum([
      'EXECUTION ERROR',
      'CANCELLED',
      'BASELINE ERROR',
      'BUDGET EXHAUSTED',
      'TIME EXHAUSTED',
      'OWNERSHIP LOST',
      'STORAGE ERROR',
      'SHUTDOWN',
    ])
    .optional(),
});
export const MinimizationResultSchema = z.strictObject({
  finding: FindingSchema,
  best: JourneySchema,
  originalLength: z.int().positive(),
  bestLength: z.int().positive(),
  attempts: z.array(AttemptSchema),
  stopReason: z.string().min(1),
  locallyIrreducible: z.boolean(),
});
export type MinimizationResult = z.infer<typeof MinimizationResultSchema>;
export interface MinimizerBoundary {
  planDeletion(
    journey: Journey,
    predicate: Predicate,
    index: number,
  ): { candidate: Journey | null; reason: string };
  preservesReduction(input: PreservationInput): boolean;
  minimizeFinding(
    supervisor: RunSupervisor,
    run: Run,
    journey: Journey,
    finding: Finding,
  ): Promise<MinimizationResult>;
}
export async function minimizerBoundary(): Promise<MinimizerBoundary> {
  const path = '../../src/engine/minimization/greedy.ts';
  let loaded: unknown;
  try {
    loaded = await import(path);
  } catch (error) {
    throw new Error(
      'T039 missing boundary: src/engine/minimization/greedy.ts',
      { cause: error },
    );
  }
  for (const member of [
    'planDeletion',
    'preservesReduction',
    'minimizeFinding',
  ])
    if (
      !loaded ||
      typeof loaded !== 'object' ||
      typeof Reflect.get(loaded, member) !== 'function'
    )
      throw new Error(`T039 must implement ${member}`);
  return loaded as MinimizerBoundary;
}
export const ids = (journey: Journey) => journey.steps.map((s) => s.id);

// Supplied redundant acceptance case, NOT blind/autonomous discovery evidence.
// Two reads are independent of each other; all order IDs bind to create.
export function redundantJourney(base: Journey): Journey {
  const [create, cancelled, later] = base.steps;
  if (!create || !cancelled || !later) throw new Error('INVALID ORDER FIXTURE');
  const read = (id: string) => ({
    ...structuredClone(cancelled),
    id,
    operationId: 'GET /api/orders/{orderId}',
  });
  return JourneySchema.parse({
    ...structuredClone(base),
    id: randomUUID(),
    steps: [
      create,
      read('readBefore'),
      cancelled,
      read('readAfter'),
      later,
      { ...create, id: 'extraOrder', extracts: [] },
    ],
    dependencies: [
      ...base.dependencies,
      ...['readBefore', 'readAfter'].map((consumer) => ({
        producer: 'create',
        consumer,
        variable: 'orderId',
      })),
    ],
    rationale:
      'Supplied redundant order-lifecycle minimization acceptance case; not discovery evidence',
  });
}
// Explicit expected candidate constructor for test data, not a minimizer.
export function without(journey: Journey, stepId: string): Journey {
  return JourneySchema.parse({
    ...structuredClone(journey),
    id: randomUUID(),
    steps: journey.steps.filter((s) => s.id !== stepId),
    dependencies: journey.dependencies.filter(
      (d) => d.producer !== stepId && d.consumer !== stepId,
    ),
  });
}
export function syntheticTrial(
  run: Run,
  journey: Journey,
  outcome: Evidence['outcome'],
  phase: 'EXPLORATION' | 'REPLAY' | 'MINIMIZATION',
) {
  const trialId = randomUUID(),
    orderId = randomUUID();
  const values: ValueContext = {
    vault: new SecretVault(),
    inputs: {},
    results: new Map(),
  };
  const observations = journey.steps.map((step, ordinal) => {
    let body: Json = {
      id: orderId,
      state:
        step.id === 'cancelled' || step.id === 'readAfter'
          ? 'CANCELLED'
          : 'CREATED',
    };
    if (step.id === 'extraOrder') body = { id: randomUUID(), state: 'CREATED' };
    if (step.id === 'later')
      body =
        outcome === 'UNEVALUABLE'
          ? {}
          : {
              id: outcome === 'NOT APPLICABLE' ? randomUUID() : orderId,
              state: outcome === 'SATISFIED' ? 'CANCELLED' : 'FULFILLED',
            };
    const status = step.operationId === 'POST /api/orders' ? 201 : 200;
    values.results.set(step.id, {
      body,
      status,
      headers: {},
      truncated: false,
      ordinal,
      operationId: step.operationId,
    });
    return ObservationSchema.parse({
      id: randomUUID(),
      runId: run.id,
      trialId,
      stepId: step.id,
      stateMappings: [],
      result: {
        stepId: step.id,
        status,
        sanitizedRequest: {},
        sanitizedResponse: { body },
        truncated: false,
        startedAt: new Date().toISOString(),
        elapsedMs: 1,
        outcome: 'RESPONSE',
      },
    });
  });
  const baseline = BaselineEvidenceSchema.parse({
    id: randomUUID(),
    runId: run.id,
    trialId,
    resetStepIds: run.reset.resetSteps.map((s) => s.id),
    checkStepIds: run.reset.checkSteps.map((s) => s.id),
    verdict: 'SATISFIED',
    assertionIds: run.reset.baselineAssertions.map((a) => a.id),
  });
  const evaluated = evaluatePredicate(run.predicates[0]!, values);
  if (evaluated !== outcome)
    throw new Error(`Invalid minimization fixture: ${evaluated} != ${outcome}`);
  const evidence = EvidenceSchema.parse({
    id: randomUUID(),
    runId: run.id,
    trialId,
    phase,
    predicateRef: journey.predicateRef,
    baselineEvidenceId: baseline.id,
    observationIds: observations.map((o) => o.id),
    outcome: evaluated,
    symbolicOperands: {},
  });
  return { evidence, baseline, observations };
}
export async function minimizationCase() {
  const c = await orderCase();
  const journey = redundantJourney(c.journey);
  const initial = syntheticTrial(c.run, journey, 'VIOLATED', 'EXPLORATION');
  const replay = syntheticTrial(c.run, journey, 'VIOLATED', 'REPLAY');
  const candidate = detectCandidate(
    c.run,
    journey,
    initial.evidence,
    initial.baseline,
    initial.observations,
  )!;
  const finding = transitionFinding({
    ...c.input,
    finding: candidate,
    initial,
    replay,
  });
  const reduced = without(journey, 'readBefore');
  const trial = syntheticTrial(c.run, reduced, 'VIOLATED', 'MINIMIZATION');
  const input: PreservationInput = {
    run: c.run,
    finding,
    original: journey,
    candidate: reduced,
    predicate: c.run.predicates[0]!,
    trial,
    usedTrialIds: [initial.evidence.trialId, replay.evidence.trialId],
    usedBaselineIds: [initial.baseline.id, replay.baseline.id],
    approvals: new Set(),
    specificationAssertions: new Map(),
  };
  return { ...c, journey, initial, replay, finding, reduced, trial, input };
}
export async function minimizationHarness(requests = 200, minimal = false) {
  const h = await orderHarness(false, requests);
  try {
    if (!minimal) Object.assign(h.journey, redundantJourney(h.journey));
    const initial = await h.trial('EXPLORATION');
    const confirmed = await replayCandidate(
      h.s,
      h.run,
      h.journey,
      initial.finding!,
    );
    return { ...h, initial, confirmed, finding: confirmed.finding };
  } catch (error) {
    await h.close();
    throw error;
  }
}
export async function history(
  h: Awaited<ReturnType<typeof minimizationHarness>>,
) {
  const query = async (table: string) =>
    (
      await h.client.query(
        `SELECT * FROM ${table} WHERE run_id=$1 ORDER BY id`,
        [h.run.id],
      )
    ).rows;
  const transitions = (
    await h.client.query(
      'SELECT * FROM finding_transitions WHERE finding_id=$1 ORDER BY id',
      [h.finding.id],
    )
  ).rows;
  return {
    evidence: await query('evidence'),
    journeys: await query('journeys'),
    steps: await query('step_records'),
    transitions,
  };
}
