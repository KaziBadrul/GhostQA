import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { PoolClient } from 'pg';
import {
  BaselineEvidenceSchema,
  EvidenceSchema,
  JourneySchema,
  ObservationSchema,
  type BaselineEvidence,
  type Evidence,
  type Finding,
  type Journey,
  type Observation,
  type Json,
  type Predicate,
  type Run,
} from '../../src/engine/contracts';
import { orderConfiguration } from '../../scripts/t035-configuration';
import { detectCandidate } from '../../src/engine/detection/candidates';
import { evaluatePredicate } from '../../src/engine/detection/predicate';
import { SecretVault } from '../../src/engine/secrets/vault';
import type { ValueContext } from '../../src/engine/execution/variables';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import { isolatedDatabase } from './database';
import { migrate } from '../../src/server/migrate';
import { RunSupervisor } from '../../src/server/run-supervisor';
import { establishFreshState } from '../../src/engine/fresh-state/manager';
import { executeJourney } from '../../src/engine/execution/journey';
import { saveEvidence } from '../../src/server/repositories/evidence';

// Consumer ports for T037, not a replacement implementation. Unknown values are
// deliberate: the deterministic boundary must validate evidence, not trust TS.
export interface VerificationInput {
  run: Run;
  finding: Finding;
  predicate: Predicate;
  initial: {
    evidence: Evidence;
    baseline: BaselineEvidence;
    observations: Observation[];
  };
  replay: { evidence: unknown; baseline: unknown; observations: Observation[] };
  initialApprovals: ReadonlySet<string>;
  replayApprovals: ReadonlySet<string>;
  specificationAssertions: ReadonlyMap<string, string>;
}
export interface FindingBoundary {
  transitionFinding(input: VerificationInput): Finding;
}
export interface ReplayBoundary {
  replayCandidate(
    supervisor: RunSupervisor,
    run: Run,
    journey: Journey,
    candidate: Finding,
  ): Promise<{
    finding: Finding;
    evidence: Evidence;
    baseline: BaselineEvidence;
  }>;
}
export interface RepositoryBoundary {
  recordVerification(
    client: PoolClient,
    input: VerificationInput,
    vault: SecretVault,
  ): Promise<Finding>;
}
async function boundary<T>(path: string, member: string): Promise<T> {
  let loaded: unknown;
  try {
    loaded = await import(path);
  } catch (error) {
    throw new Error(`T037 missing boundary: ${path}`, { cause: error });
  }
  if (
    !loaded ||
    typeof loaded !== 'object' ||
    !(member in loaded) ||
    typeof Reflect.get(loaded, member) !== 'function'
  )
    throw new Error(`T037 must implement ${member} in ${path}`);
  return loaded as T;
}
export const findingBoundary = () =>
  boundary<FindingBoundary>(
    '../../src/engine/detection/findings.ts',
    'transitionFinding',
  );
export const replayBoundary = () =>
  boundary<ReplayBoundary>(
    '../../src/engine/verification/replay.ts',
    'replayCandidate',
  );
export const repositoryBoundary = () =>
  boundary<RepositoryBoundary>(
    '../../src/server/repositories/findings.ts',
    'recordVerification',
  );

const snapshot = z
  .object({ journeys: z.array(z.object({ definition: JourneySchema })) })
  .parse(
    JSON.parse(
      readFileSync(
        resolve('tests/acceptance/vertical-slice-order-passed.json'),
        'utf8',
      ),
    ) as unknown,
  );
export function orderJourney(run: Run): Journey {
  const journey = structuredClone(snapshot.journeys[0]!.definition);
  journey.id = randomUUID();
  const p = run.predicates[0]!;
  journey.predicateRef = {
    id: p.id,
    version: p.version,
    hash: p.canonicalHash,
  };
  return JourneySchema.parse(journey);
}
export async function orderCase() {
  const publicDocument: unknown = JSON.parse(
    readFileSync(resolve('fixtures/openapi/order-lifecycle.json'), 'utf8'),
  );
  const { run } = await orderConfiguration(
    publicDocument,
    'http://127.0.0.1:34567',
    'configured-model',
  );
  const journey = orderJourney(run);
  const initial = orderEvidence(run, journey, 'VIOLATED', 'EXPLORATION');
  const finding = detectCandidate(
    run,
    journey,
    initial.evidence,
    initial.baseline,
    initial.observations,
  )!;
  const replay = orderEvidence(run, journey, 'VIOLATED', 'REPLAY');
  const input: VerificationInput = {
    run,
    finding,
    predicate: run.predicates[0]!,
    initial,
    replay,
    initialApprovals: new Set(),
    replayApprovals: new Set(),
    specificationAssertions: new Map(),
  };
  return { run, journey, initial, replay, finding, input };
}
export function orderEvidence(
  run: Run,
  journey: Journey,
  outcome: Evidence['outcome'],
  phase: 'EXPLORATION' | 'REPLAY',
) {
  const trialId = randomUUID();
  const orderId = randomUUID();
  const values: ValueContext = {
    vault: new SecretVault(),
    inputs: {},
    results: new Map(),
  };
  const bodies: Json[] = [
    { id: orderId, state: 'CREATED' },
    { id: orderId, state: 'CANCELLED' },
    outcome === 'UNEVALUABLE'
      ? {}
      : {
          id: outcome === 'NOT APPLICABLE' ? randomUUID() : orderId,
          state: outcome === 'SATISFIED' ? 'CANCELLED' : 'FULFILLED',
        },
  ];
  const observations = journey.steps.map((step, ordinal) => {
    const body = bodies[ordinal]!;
    values.results.set(step.id, {
      body,
      status: ordinal === 0 ? 201 : 200,
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
        status: ordinal === 0 ? 201 : 200,
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
    resetStepIds: ['reset'],
    checkStepIds: ['baseline'],
    verdict: 'SATISFIED',
    assertionIds: run.reset.baselineAssertions.map((a) => a.id),
  });
  const evaluated = evaluatePredicate(run.predicates[0]!, values);
  if (evaluated !== outcome)
    throw new Error(`Invalid T036 fixture: ${evaluated} != ${outcome}`);
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

// All engine requests, including test discovery, go through the real supervisor.
export async function orderHarness(repaired = false, requests = 200) {
  let target = await startOrderFixture(repaired);
  const db = await isolatedDatabase();
  let supervisor: RunSupervisor | undefined;
  try {
    await migrate(db.client, resolve('migrations'));
    const { run } = await orderConfiguration(
      target.openapi,
      target.url,
      'configured-model',
    );
    await db.client.query('INSERT INTO projects(id,name) VALUES ($1,$2)', [
      run.projectId,
      'T036 orders',
    ]);
    supervisor = await RunSupervisor.acquire(db.client);
    run.budget.limits.requests = requests;
    await supervisor.accept(run);
    const journey = orderJourney(run);
    const s = supervisor;
    return {
      s,
      run,
      journey,
      client: db.client,
      async repair() {
        const port = target.port;
        await target.close();
        target = await startOrderFixture(true, port);
      },
      async trial(phase: 'EXPLORATION' | 'REPLAY') {
        const trial = await establishFreshState(s, run, journey, phase, {});
        await executeJourney(s, run, journey, trial);
        const trace = await s.repository.trace(run.projectId, run.id);
        const observations = trace.observations.filter(
          (o) =>
            o.trialId === trial.id &&
            journey.steps.some((step) => step.id === o.stepId),
        );
        const evidence = await saveEvidence(
          db.client,
          {
            id: randomUUID(),
            runId: run.id,
            trialId: trial.id,
            phase,
            predicateRef: journey.predicateRef,
            baselineEvidenceId: trial.baseline.id,
            observationIds: observations.map((o) => o.id),
            outcome: evaluatePredicate(run.predicates[0]!, trial.values),
            symbolicOperands: {},
          },
          trial.values.vault,
        );
        const finding =
          phase === 'EXPLORATION'
            ? await s.repository.initialCandidate(
                run,
                journey,
                evidence,
                trial.baseline,
                observations,
                trial.values.vault,
              )
            : null;
        s.finishTrial();
        return { evidence, baseline: trial.baseline, observations, finding };
      },
      async close() {
        await s.shutdown();
        await db.close();
        await target.close();
      },
    };
  } catch (error) {
    await supervisor?.shutdown();
    await db.close();
    await target.close();
    throw error;
  }
}
