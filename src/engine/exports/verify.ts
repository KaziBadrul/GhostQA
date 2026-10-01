import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  BaselineEvidenceSchema,
  RegressionArtifactSchema,
  type Json,
  type Run,
} from '../contracts';
import { canonical, evaluatePredicate } from '../detection/predicate';
import { establishFreshState, FreshStateError } from '../fresh-state/manager';
import { executeJourney } from '../execution/journey';
import { observedValues } from '../minimization/greedy';
import { SecretVault } from '../secrets/vault';
import { RunSupervisor } from '../../server/run-supervisor';
import { saveEvidence } from '../../server/repositories/evidence';
import {
  registerArtifact,
  recordArtifactVerification,
} from '../../server/repositories/artifacts';
import {
  ArtifactVerificationSchema,
  type ArtifactVerification,
  type GeneratedExport,
} from './contracts';
import { artifactSource } from './verification-source';
import {
  assertionEvaluations,
  intendedAssertionReproduced,
} from './assertions';

const Failure = z.enum([
  'BUDGET EXHAUSTED',
  'TIME EXHAUSTED',
  'CANCELLED',
  'OWNERSHIP LOST',
  'BASELINE ERROR',
  'EXECUTION ERROR',
  'STORAGE ERROR',
  'WORKER ERROR',
  'SHUTDOWN',
]);
export async function verifyArtifact(
  supervisor: RunSupervisor,
  runInput: Run,
  generatedInput: GeneratedExport,
  inputs: Record<string, Json> = {},
) {
  if (!(supervisor instanceof RunSupervisor))
    throw new Error('ORIGINATING SUPERVISOR REQUIRED');
  // Invalid/stale caller content is rejected before writes, admission or dispatch.
  const source = await artifactSource(supervisor, runInput, generatedInput);
  const { run, generated } = source,
    m = generated.manifest;
  const failedSets = [source.initial, ...source.replays, source.bestTrial].map(
    (trial) => {
      const values = observedValues(
        trial === source.bestTrial ? m.journey : source.original,
        trial.observations,
      );
      try {
        return assertionEvaluations(m.predicate, values)
          .filter((e) => e.outcome === 'VIOLATED')
          .map((e) => e.assertionId);
      } finally {
        values.vault.discard();
      }
    },
  );
  const intended = failedSets[0]!.filter((id) =>
    failedSets.every((set) => set.includes(id)),
  );
  const prior = await supervisor.client.query<{ id: string; trial_id: string }>(
    "SELECT id,trial_id FROM evidence WHERE run_id=$1 AND kind='BASELINE'",
    [run.id],
  );
  await registerArtifact(supervisor.client, generated);
  let audit: ArtifactVerification = {
    artifactId: generated.artifact.id,
    manifestHash: generated.artifact.manifestHash,
    predicateRef: m.predicateRef,
    sourceJourneyId: m.journey.id,
    verified: false,
    reason: 'INTENDED ASSERTION NOT REPRODUCED',
    intendedAssertionIds: intended,
    evaluations: [],
  };
  try {
    // This is the originating supervisor's live manager, not the supplied run's
    // counters. No model, standalone runner, copied budget or target transport.
    const active = supervisor.snapshot;
    if (active.id !== run.id) throw new Error('EXECUTION ERROR');
    // The immutable source ID identifies content; the new execution record ID
    // permits a genuinely independent trial without overwriting that journey.
    const executionJourney = {
      ...structuredClone(m.journey),
      id: randomUUID(),
    };
    audit.executionJourneyId = executionJourney.id;
    const trial = await establishFreshState(
      supervisor,
      active,
      executionJourney,
      'ARTIFACT',
      inputs,
    );
    audit.trialId = trial.id;
    try {
      const baseline = BaselineEvidenceSchema.parse(trial.baseline);
      supervisor.assertTrial(trial.id, baseline.id);
      if (
        baseline.runId !== run.id ||
        baseline.trialId !== trial.id ||
        prior.rows.some((p) => p.id === baseline.id || p.trial_id === trial.id)
      )
        throw new Error('BASELINE ERROR');
      const rows = await supervisor.client.query<{ evaluation: unknown }>(
        "SELECT evaluation FROM evidence WHERE id=$1 AND run_id=$2 AND trial_id=$3 AND kind='BASELINE'",
        [baseline.id, run.id, trial.id],
      );
      if (canonical(rows.rows[0]?.evaluation) !== canonical(baseline))
        throw new Error('BASELINE ERROR');
      supervisor.assertTrial(trial.id, baseline.id);
      audit.baseline = baseline;
    } catch {
      supervisor.closeGate('BASELINE ERROR');
      throw new Error(supervisor.stopReason ?? 'BASELINE ERROR');
    }
    await executeJourney(supervisor, active, executionJourney, trial);
    supervisor.assertTrial(trial.id, audit.baseline!.id);
    const trace = await supervisor.repository.trace(run.projectId, run.id);
    const observations = executionJourney.steps.map((step) => {
      const observation = trace.observations.find(
        (o) => o.trialId === trial.id && o.stepId === step.id,
      );
      if (!observation) throw new Error('STORAGE ERROR');
      return observation;
    });
    const verdict = evaluatePredicate(m.predicate, trial.values);
    audit.evaluations = assertionEvaluations(m.predicate, trial.values);
    audit.evidence = await saveEvidence(
      supervisor.client,
      {
        id: randomUUID(),
        runId: run.id,
        trialId: trial.id,
        phase: 'ARTIFACT',
        predicateRef: m.predicateRef,
        baselineEvidenceId: audit.baseline!.id,
        observationIds: observations.map((o) => o.id),
        outcome: verdict,
        symbolicOperands: trial.values.vault.sanitize(
          {
            manifestHash: generated.artifact.manifestHash,
            applicability: m.predicate.applicability,
            assertions: m.assertions,
            executionOrder: executionJourney.steps.map((s, ordinal) => ({
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
    supervisor.assertTrial(trial.id, audit.baseline!.id);
    audit.verified = intendedAssertionReproduced(
      verdict,
      intended,
      audit.evaluations,
    );
    audit.reason = audit.verified
      ? 'ARTIFACT VERIFIED'
      : verdict === 'VIOLATED'
        ? 'INTENDED ASSERTION NOT REPRODUCED'
        : verdict === 'SATISFIED'
          ? 'ASSERTION SATISFIED'
          : verdict === 'NOT APPLICABLE'
            ? 'ASSERTION NOT APPLICABLE'
            : 'ASSERTION UNEVALUABLE';
    audit.provenance = {
      runId: run.id,
      manifestHash: generated.artifact.manifestHash,
      authority: 'SUPERVISED_RUN_PATH',
      assertionIds: audit.evaluations.map((e) => e.assertionId),
    };
    if (audit.verified) audit.verifiedAt = new Date().toISOString();
    await recordArtifactVerification(
      supervisor,
      run,
      generated,
      ArtifactVerificationSchema.parse(audit),
      trial.values.vault,
    );
    // Commit is complete; later cancellation cannot erase this historical proof.
    const artifact = RegressionArtifactSchema.parse({
      ...generated.artifact,
      verification: audit.verified ? 'VERIFIED' : 'UNVERIFIED',
      verificationEvidenceIds: audit.verified ? [audit.evidence.id] : [],
    });
    try {
      if (!supervisor.stopReason) supervisor.finishTrial();
    } catch (error) {
      const reason =
        error instanceof Error && Failure.safeParse(error.message).success
          ? error.message
          : 'EXECUTION ERROR';
      try {
        await supervisor.stop(reason);
      } catch {
        /* Commit evidence remains durable. */
      }
    }
    return {
      artifact,
      reason: audit.reason,
      baseline: audit.baseline,
      evidence: audit.evidence,
      provenance: audit.provenance,
      persistence: 'RECORDED' as const,
    };
  } catch (error) {
    const reason = Failure.parse(
      supervisor.stopReason ??
        (error instanceof Error && Failure.safeParse(error.message).success
          ? error.message
          : 'STORAGE ERROR'),
    );
    if (error instanceof FreshStateError) audit.trialId = error.trialId;
    // A partial/failing execution is not a predicate verdict and cannot verify.
    try {
      await supervisor.stop(reason);
    } catch {
      /* Lost storage/lock never reopens authority. */
    }
    audit = { ...audit, verified: false, reason };
    delete audit.verifiedAt;
    let persistence: 'RECORDED' | 'UNAVAILABLE' = 'UNAVAILABLE';
    const vault = new SecretVault();
    try {
      await recordArtifactVerification(
        supervisor,
        run,
        generated,
        audit,
        vault,
      );
      persistence = 'RECORDED';
    } catch {
      /* Report unavailable persistence honestly, without a fabricated VERIFIED. */
    } finally {
      vault.discard();
    }
    return {
      artifact: generated.artifact,
      reason,
      baseline: audit.baseline,
      evidence: audit.evidence,
      persistence,
    };
  }
}
