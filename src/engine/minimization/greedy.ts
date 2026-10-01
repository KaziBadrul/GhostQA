import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import {
  BaselineEvidenceSchema,
  EvidenceSchema,
  FindingSchema,
  JourneySchema,
  ObservationSchema,
  RunSchema,
  type BaselineEvidence,
  type Finding,
  type Journey,
  type Json,
  type Observation,
  type Predicate,
  type Run,
} from '../contracts';
import {
  MinimizationAttemptSchema,
  MinimizationFailureSchema,
  MinimizationResultSchema,
  type MinimizationAttempt,
} from '../contracts/minimization';
import { canonical, evaluatePredicate } from '../detection/predicate';
import { samePredicate, validateVerification } from '../detection/findings';
import { validateJourney } from '../validation/journey';
import { eligiblePredicate, validatePredicate } from '../validation/predicate';
import { SecretVault } from '../secrets/vault';
import { extract, type ValueContext } from '../execution/variables';
import { establishFreshState, FreshStateError } from '../fresh-state/manager';
import { executeJourney } from '../execution/journey';
import { saveEvidence } from '../../server/repositories/evidence';
import {
  loadFinding,
  loadFindingJourney,
  loadFindingRun,
  loadTrialEvidence,
  verificationApprovals,
} from '../../server/repositories/findings';
import {
  recordMinimizationAttempt,
  finishMinimization,
} from '../../server/repositories/minimization';
import type { RunSupervisor } from '../../server/run-supervisor';

import {
  identity,
  definition,
  deletedCandidate,
  planDeletion,
} from './deletion';
export { planDeletion } from './deletion';

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
const exactIds = (a: string[], b: string[]) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));
function checkBaseline(
  run: Run,
  value: unknown,
  trialId: string,
  usedTrials: readonly string[],
  usedBaselines: readonly string[],
): BaselineEvidence {
  const baseline = BaselineEvidenceSchema.parse(value);
  if (
    baseline.runId !== run.id ||
    baseline.trialId !== trialId ||
    usedTrials.includes(trialId) ||
    usedBaselines.includes(baseline.id) ||
    !exactIds(
      baseline.resetStepIds,
      run.reset.resetSteps.map((s) => s.id),
    ) ||
    !exactIds(
      baseline.checkStepIds,
      run.reset.checkSteps.map((s) => s.id),
    ) ||
    !exactIds(
      baseline.assertionIds,
      run.reset.baselineAssertions.map((a) => a.id),
    )
  )
    throw new Error('BASELINE ERROR');
  return baseline;
}
export function observedValues(
  journey: Journey,
  observations: Observation[],
): ValueContext {
  const values: ValueContext = {
    vault: new SecretVault(),
    inputs: {},
    results: new Map(),
  };
  const response = z.object({
    body: z.unknown().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    text: z.string().optional(),
  });
  // Persisted symbolic observations cannot prove a predicate requiring unavailable
  // secrets/configured inputs. Production supplies its actual trial-local values.
  for (const [ordinal, observation] of observations.entries()) {
    const safe = response.parse(observation.result.sanitizedResponse);
    values.results.set(observation.stepId, {
      ordinal,
      operationId: journey.steps[ordinal]!.operationId,
      status: observation.result.status ?? 0,
      headers: safe.headers ?? {},
      body: (safe.body ?? null) as Json,
      text: safe.text,
      truncated: false,
      request: observation.result.sanitizedRequest,
    });
    for (const v of journey.steps[ordinal]!.extracts) extract(v, values);
  }
  return values;
}
export function preservesReduction(
  input: PreservationInput,
  trialValues?: ValueContext,
): boolean {
  const run = RunSchema.parse(input.run),
    finding = FindingSchema.parse(input.finding),
    predicate = validatePredicate(input.predicate);
  const original = JourneySchema.parse(input.original),
    candidate = validateJourney(
      input.candidate,
      run.apiSnapshot,
      run.scope,
      'MINIMIZATION',
    );
  const evidence = EvidenceSchema.parse(input.trial.evidence),
    observations = input.trial.observations.map((o) =>
      ObservationSchema.parse(o),
    );
  if (
    finding.classification !== 'CONFIRMED' ||
    !finding.consistent ||
    finding.replayEvidenceIds.length === 0 ||
    finding.projectId !== run.projectId ||
    ![
      finding.predicateRef,
      original.predicateRef,
      candidate.predicateRef,
      evidence.predicateRef,
    ].every((ref) => samePredicate(ref, identity(predicate))) ||
    !run.predicates.some((p) => canonical(p) === canonical(predicate)) ||
    !eligiblePredicate(
      predicate,
      input.approvals,
      input.specificationAssertions,
    ) ||
    evidence.runId !== run.id ||
    evidence.phase !== 'MINIMIZATION' ||
    evidence.id === finding.initialEvidenceId ||
    finding.replayEvidenceIds.includes(evidence.id)
  )
    return false;
  if (
    !original.steps.some((_, index) => {
      const planned = planDeletion(original, predicate, index).candidate;
      return planned !== null && definition(planned) === definition(candidate);
    })
  )
    return false;
  const baseline = checkBaseline(
    run,
    input.trial.baseline,
    evidence.trialId,
    input.usedTrialIds,
    input.usedBaselineIds,
  );
  if (
    baseline.id !== evidence.baselineEvidenceId ||
    observations.length !== candidate.steps.length ||
    !exactIds(
      evidence.observationIds,
      observations.map((o) => o.id),
    ) ||
    observations.some(
      (o, index) =>
        o.runId !== run.id ||
        o.trialId !== evidence.trialId ||
        o.stepId !== candidate.steps[index]!.id ||
        o.result.stepId !== o.stepId ||
        o.result.outcome !== 'RESPONSE' ||
        o.result.truncated,
    )
  )
    return false;
  const values = trialValues ?? observedValues(candidate, observations);
  try {
    return (
      evidence.outcome === 'VIOLATED' &&
      evaluatePredicate(predicate, values) === 'VIOLATED'
    );
  } finally {
    if (!trialValues) values.vault.discard();
  }
}

export async function minimizeFinding(
  supervisor: RunSupervisor,
  runInput: Run,
  journeyInput: Journey,
  findingInput: Finding,
  inputs: Record<string, Json> = {},
) {
  const requestedRun = RunSchema.parse(runInput),
    requested = FindingSchema.parse(findingInput),
    requestedJourney = JourneySchema.parse(journeyInput);
  const stored = await loadFinding(
    supervisor.client,
    requested.projectId,
    requested.id,
  );
  if (
    stored.runId !== requestedRun.id ||
    canonical(stored.finding) !== canonical(requested) ||
    requested.classification !== 'CONFIRMED' ||
    !requested.consistent ||
    !requested.replayEvidenceIds.length
  )
    throw new Error('MINIMIZATION REQUIRES CONFIRMED FINDING');
  const run = await loadFindingRun(
    supervisor.client,
    stored.runId,
    requested.projectId,
  );
  const source = await loadFindingJourney(supervisor.client, run, requested);
  if (
    canonical(source) !== canonical(requestedJourney) ||
    ['apiSnapshot', 'scope', 'reset', 'predicates', 'credentialBindings'].some(
      (key) =>
        canonical(Reflect.get(requestedRun, key)) !==
        canonical(Reflect.get(run, key)),
    )
  )
    throw new Error('MINIMIZATION IDENTITY MISMATCH');
  const eligibility = await verificationApprovals(
    supervisor.client,
    run,
    requested,
  );
  const predicate = validatePredicate(eligibility.predicate);
  if (
    !eligiblePredicate(
      predicate,
      eligibility.replayApprovals,
      eligibility.specificationAssertions,
    )
  )
    throw new Error('INELIGIBLE PREDICATE');
  const initial = await loadTrialEvidence(
    supervisor.client,
    run,
    requested.initialEvidenceId,
    'EXPLORATION',
    source,
  );
  for (const replayId of requested.replayEvidenceIds) {
    const replay = await loadTrialEvidence(
      supervisor.client,
      run,
      replayId,
      'REPLAY',
      source,
    );
    validateVerification({
      run,
      finding: {
        ...requested,
        replayEvidenceIds: requested.replayEvidenceIds.filter(
          (id) => id !== replayId,
        ),
      },
      ...eligibility,
      initial,
      replay,
    });
    if (
      initial.evidence.outcome !== 'VIOLATED' ||
      replay.evidence.outcome !== 'VIOLATED'
    )
      throw new Error('INVALID CONFIRMATION');
  }
  const previous = await supervisor.client.query<{
    id: string;
    trial_id: string;
  }>("SELECT id,trial_id FROM evidence WHERE run_id=$1 AND kind='BASELINE'", [
    run.id,
  ]);
  const usedTrials = previous.rows.map((r) => r.trial_id),
    usedBaselines = previous.rows.map((r) => r.id);
  let best = structuredClone(source);
  if (
    requested.minimizedJourneyId &&
    requested.minimizedJourneyId !== source.id
  ) {
    const rows = await supervisor.client.query<{
      definition: unknown;
      evaluation: unknown;
    }>(
      `SELECT j.definition,e.evaluation FROM journeys j JOIN evidence e ON e.run_id=j.run_id
       WHERE j.id=$1 AND j.run_id=$2 AND j.phase='MINIMIZATION' AND e.kind='MINIMIZATION ATTEMPT'
       AND e.evaluation->>'findingId'=$3 AND e.evaluation->'attempt'->>'accepted'='true'
       AND e.evaluation->'attempt'->'candidate'->>'id'=j.id::text ORDER BY e.created_at DESC LIMIT 1`,
      [requested.minimizedJourneyId, run.id, requested.id],
    );
    if (!rows.rows[0]) throw new Error('MINIMIZATION EVIDENCE REQUIRED');
    best = JourneySchema.parse(rows.rows[0].definition);
    const recorded = z
      .object({ attempt: MinimizationAttemptSchema })
      .parse(rows.rows[0].evaluation).attempt;
    if (
      !recorded.evidence ||
      definition(best) !== definition(recorded.candidate) ||
      best.steps.length >= source.steps.length
    )
      throw new Error('MINIMIZATION EVIDENCE MISMATCH');
    await loadTrialEvidence(
      supervisor.client,
      run,
      recorded.evidence.id,
      'MINIMIZATION',
      best,
    );
  }
  const attempts: MinimizationAttempt[] = [],
    visited = new Set<string>();
  const vault = new SecretVault();
  let stopReason = 'LOCAL MINIMUM',
    locallyIrreducible = false;
  let currentAttempt: MinimizationAttempt | undefined;
  try {
    if (supervisor.snapshot.id !== run.id) throw new Error('EXECUTION ERROR');
    // n<=10. Successful deletions strictly shorten best; finite scans plus visited
    // definitions bound failed retries. No copied budget is execution authority.
    for (let scan = 0; scan <= source.steps.length; scan++) {
      supervisor.assertAuthority();
      let reduced = false;
      for (let index = 0; index < best.steps.length; index++) {
        supervisor.assertAuthority();
        const planned = planDeletion(best, predicate, index);
        const candidate = planned.candidate ?? deletedCandidate(best, index);
        // An empty candidate cannot be represented by the journey contract.
        if (!candidate.steps.length) continue;
        const hash = createHash('sha256')
          .update(definition(candidate))
          .digest('hex');
        if (visited.has(hash)) continue;
        visited.add(hash);
        currentAttempt = {
          candidate,
          removedStepId: best.steps[index]!.id,
          accepted: false,
          reason: planned.reason,
          observations: [],
        };
        if (!planned.candidate) {
          await recordMinimizationAttempt(
            supervisor.client,
            run,
            requested,
            source,
            currentAttempt,
            best,
            vault,
          );
          attempts.push(currentAttempt);
          currentAttempt = undefined;
          continue;
        }
        const trial = await establishFreshState(
          supervisor,
          supervisor.snapshot,
          candidate,
          'MINIMIZATION',
          inputs,
        );
        currentAttempt.trialId = trial.id;
        try {
          try {
            checkBaseline(
              run,
              trial.baseline,
              trial.id,
              usedTrials,
              usedBaselines,
            );
            supervisor.assertTrial(trial.id, trial.baseline.id);
            const actual = await supervisor.client.query<{
              evaluation: unknown;
            }>(
              "SELECT evaluation FROM evidence WHERE id=$1 AND run_id=$2 AND trial_id=$3 AND kind='BASELINE'",
              [trial.baseline.id, run.id, trial.id],
            );
            if (
              canonical(actual.rows[0]?.evaluation) !==
              canonical(trial.baseline)
            )
              throw new Error('BASELINE ERROR');
          } catch {
            supervisor.closeGate('BASELINE ERROR');
            throw new Error(supervisor.stopReason ?? 'BASELINE ERROR');
          }
          currentAttempt.trialId = trial.id;
          currentAttempt.baseline = trial.baseline;
          await executeJourney(
            supervisor,
            supervisor.snapshot,
            candidate,
            trial,
          );
          supervisor.assertTrial(trial.id, trial.baseline.id);
          const trace = await supervisor.repository.trace(
            run.projectId,
            run.id,
          );
          const observations = candidate.steps.map((step) => {
            const o = trace.observations.find(
              (o) => o.trialId === trial.id && o.stepId === step.id,
            );
            if (!o) throw new Error('STORAGE ERROR');
            return o;
          });
          const evidence = await saveEvidence(
            supervisor.client,
            {
              id: randomUUID(),
              runId: run.id,
              trialId: trial.id,
              phase: 'MINIMIZATION',
              predicateRef: identity(predicate),
              baselineEvidenceId: trial.baseline.id,
              observationIds: observations.map((o) => o.id),
              outcome: evaluatePredicate(predicate, trial.values),
              symbolicOperands: trial.values.vault.sanitize(
                {
                  applicability: predicate.applicability,
                  assertions: predicate.assertions,
                  executionOrder: candidate.steps.map((s, ordinal) => ({
                    stepId: s.id,
                    ordinal,
                    operationId: s.operationId,
                  })),
                } as unknown as Json,
                true,
              ),
            },
            trial.values.vault,
          );
          currentAttempt.evidence = evidence;
          currentAttempt.observations = observations;
          currentAttempt.accepted = preservesReduction(
            {
              run,
              finding: requested,
              original: best,
              candidate,
              predicate,
              trial: { evidence, baseline: trial.baseline, observations },
              usedTrialIds: usedTrials,
              usedBaselineIds: usedBaselines,
              approvals: eligibility.replayApprovals,
              specificationAssertions: eligibility.specificationAssertions,
            },
            trial.values,
          );
          currentAttempt.reason = currentAttempt.accepted
            ? 'EXACT FRESH VIOLATION PRESERVED'
            : `REDUCTION NOT PRESERVED: ${evidence.outcome}`;
          supervisor.assertTrial(trial.id, trial.baseline.id);
          const nextBest = currentAttempt.accepted ? candidate : best;
          await recordMinimizationAttempt(
            supervisor.client,
            run,
            requested,
            source,
            currentAttempt,
            nextBest,
            trial.values.vault,
          );
          attempts.push(currentAttempt);
          reduced = currentAttempt.accepted;
          best = nextBest;
          usedTrials.push(trial.id);
          usedBaselines.push(trial.baseline.id);
          currentAttempt = undefined;
        } finally {
          if (!supervisor.stopReason) supervisor.finishTrial();
        }
        if (reduced) break;
      }
      if (!reduced) {
        locallyIrreducible = true;
        break;
      }
    }
    supervisor.assertAuthority();
  } catch (error) {
    locallyIrreducible = false;
    stopReason =
      supervisor.stopReason ??
      (error instanceof Error &&
      MinimizationFailureSchema.safeParse(error.message).success
        ? error.message
        : 'STORAGE ERROR');
    await supervisor.stop(stopReason);
    if (currentAttempt) {
      if (error instanceof FreshStateError)
        currentAttempt.trialId = error.trialId;
      currentAttempt.accepted = false;
      currentAttempt.reason = `MINIMIZATION STOPPED: ${stopReason}`;
      currentAttempt.executionOutcome =
        MinimizationFailureSchema.parse(stopReason);
      const partial = await supervisor.client.query<{ trial_id: string }>(
        'SELECT trial_id FROM step_records WHERE run_id=$1 AND journey_id=$2 ORDER BY ordinal LIMIT 1',
        [run.id, currentAttempt.candidate.id],
      );
      currentAttempt.trialId ??= partial.rows[0]?.trial_id;
      if (currentAttempt.trialId) {
        const trace = await supervisor.repository.trace(run.projectId, run.id);
        currentAttempt.observations = trace.observations.filter(
          (o) => o.trialId === currentAttempt!.trialId,
        );
      }
      // Execution failure does not manufacture a predicate evaluation.
      delete currentAttempt.evidence;
      await recordMinimizationAttempt(
        supervisor.client,
        run,
        requested,
        source,
        currentAttempt,
        best,
        vault,
      );
      attempts.push(currentAttempt);
    }
  }
  try {
    const finding = await finishMinimization(
      supervisor.client,
      requested,
      best,
      stopReason,
      locallyIrreducible,
      vault,
    );
    return MinimizationResultSchema.parse({
      finding,
      best,
      originalLength: source.steps.length,
      bestLength: best.steps.length,
      attempts: attempts.map((a) => MinimizationAttemptSchema.parse(a)),
      stopReason,
      locallyIrreducible,
    });
  } finally {
    vault.discard();
  }
}
