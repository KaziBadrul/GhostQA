import { randomUUID } from 'node:crypto';
import {
  FindingSchema,
  JourneySchema,
  RunSchema,
  type Finding,
  type Journey,
  type Json,
  type Run,
} from '../contracts';
import { canonical, evaluatePredicate } from '../detection/predicate';
import { samePredicate } from '../detection/findings';
import { validatePredicate } from '../validation/predicate';
import { establishFreshState } from '../fresh-state/manager';
import { executeJourney } from '../execution/journey';
import { saveEvidence } from '../../server/repositories/evidence';
import {
  loadFinding,
  loadFindingRun,
  loadFindingJourney,
  loadTrialEvidence,
  verificationApprovals,
  recordVerification,
  recordVerificationFailure,
} from '../../server/repositories/findings';
import type { RunSupervisor } from '../../server/run-supervisor';

export async function replayCandidate(
  supervisor: RunSupervisor,
  runInput: Run,
  journeyInput: Journey,
  candidateInput: Finding,
  inputs: Record<string, Json> = {},
) {
  const requestedRun = RunSchema.parse(runInput);
  const requestedJourney = JourneySchema.parse(journeyInput);
  const requested = FindingSchema.parse(candidateInput);
  // Resolve immutable discovery identity before any admission/reset. Invalid
  // caller plans do not append verification failures or consume target budget.
  const stored = await loadFinding(
    supervisor.client,
    requested.projectId,
    requested.id,
  );
  if (
    stored.runId !== requestedRun.id ||
    canonical(stored.finding) !== canonical(requested)
  )
    throw new Error('STALE FINDING');
  const run = await loadFindingRun(
    supervisor.client,
    stored.runId,
    requested.projectId,
  );
  const journey = await loadFindingJourney(
    supervisor.client,
    run,
    stored.finding,
  );
  if (
    canonical(journey) !== canonical(requestedJourney) ||
    !samePredicate(journey.predicateRef, requested.predicateRef) ||
    ['apiSnapshot', 'scope', 'reset', 'predicates', 'credentialBindings'].some(
      (key) =>
        canonical(Reflect.get(requestedRun, key)) !==
        canonical(Reflect.get(run, key)),
    )
  )
    throw new Error('VERIFICATION IDENTITY MISMATCH');
  const initial = await loadTrialEvidence(
    supervisor.client,
    run,
    requested.initialEvidenceId,
    'EXPLORATION',
    journey,
  );
  const eligibility = await verificationApprovals(
    supervisor.client,
    run,
    stored.finding,
  );
  const predicate = validatePredicate(eligibility.predicate);
  try {
    // The supervisor owns admission, cancellation, full-trial budget, fresh
    // reset/checks, scope and dispatch. Discovery values are never carried over.
    const active = supervisor.snapshot;
    if (active.id !== run.id) throw new Error('EXECUTION ERROR');
    const replayJourney = { ...journey, id: randomUUID() };
    const trial = await establishFreshState(
      supervisor,
      active,
      replayJourney,
      'REPLAY',
      inputs,
    );
    try {
      await executeJourney(supervisor, active, replayJourney, trial);
      supervisor.assertTrial(trial.id, trial.baseline.id);
      const trace = await supervisor.repository.trace(run.projectId, run.id);
      const observations = trace.observations.filter(
        (o) =>
          o.trialId === trial.id &&
          journey.steps.some((s) => s.id === o.stepId),
      );
      const evidence = await saveEvidence(
        supervisor.client,
        {
          id: randomUUID(),
          runId: run.id,
          trialId: trial.id,
          phase: 'REPLAY',
          predicateRef: journey.predicateRef,
          baselineEvidenceId: trial.baseline.id,
          observationIds: observations.map((o) => o.id),
          outcome: evaluatePredicate(predicate, trial.values),
          symbolicOperands: trial.values.vault.sanitize(
            {
              applicability: predicate.applicability,
              assertions: predicate.assertions,
              executionOrder: journey.steps.map((s, ordinal) => ({
                stepId: s.id,
                ordinal,
                operationId: s.operationId,
              })),
            },
            true,
          ),
        },
        trial.values.vault,
      );
      supervisor.assertTrial(trial.id, trial.baseline.id);
      const finding = await recordVerification(
        supervisor.client,
        {
          run,
          finding: stored.finding,
          ...eligibility,
          initial,
          replay: { evidence, baseline: trial.baseline, observations },
        },
        trial.values.vault,
      );
      return { finding, evidence, baseline: trial.baseline };
    } finally {
      if (!supervisor.stopReason) supervisor.finishTrial();
    }
  } catch (error) {
    const reason =
      supervisor.stopReason ??
      (error instanceof Error &&
      [
        'BUDGET EXHAUSTED',
        'TIME EXHAUSTED',
        'CANCELLED',
        'BASELINE ERROR',
        'EXECUTION ERROR',
        'OWNERSHIP LOST',
        'STORAGE ERROR',
        'WORKER ERROR',
        'SHUTDOWN',
      ].includes(error.message)
        ? error.message
        : 'STORAGE ERROR');
    await supervisor.stop(reason);
    await recordVerificationFailure(
      supervisor.client,
      requested.projectId,
      requested.id,
      reason,
    );
    throw new Error(reason);
  }
}
