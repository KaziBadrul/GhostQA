import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import {
  FindingSchema,
  JourneySchema,
  type Finding,
  type Journey,
  type Run,
  type Json,
} from '../../engine/contracts';
import {
  MinimizationAttemptSchema,
  type MinimizationAttempt,
} from '../../engine/contracts/minimization';
import { canonical } from '../../engine/detection/predicate';
import { samePredicate } from '../../engine/detection/findings';
import type { SecretVault } from '../../engine/secrets/vault';
import { planDeletion, definition } from '../../engine/minimization/deletion';
import { loadFinding, loadTrialEvidence } from './findings';

// Decisions extend existing immutable evidence; they do not change finding
// classifications or mutate original journeys/confirmation transitions.
export async function recordMinimizationAttempt(
  client: PoolClient,
  run: Run,
  finding: Finding,
  source: Journey,
  attemptInput: MinimizationAttempt,
  best: Journey,
  vault: SecretVault,
) {
  const attempt = MinimizationAttemptSchema.parse(attemptInput);
  if (
    !samePredicate(source.predicateRef, finding.predicateRef) ||
    !samePredicate(attempt.candidate.predicateRef, finding.predicateRef) ||
    !samePredicate(best.predicateRef, finding.predicateRef)
  )
    throw new Error('MINIMIZATION IDENTITY MISMATCH');
  if (attempt.evidence) {
    const actual = await loadTrialEvidence(
      client,
      run,
      attempt.evidence.id,
      'MINIMIZATION',
      attempt.candidate,
    );
    if (
      canonical(actual.evidence) !== canonical(attempt.evidence) ||
      canonical(actual.baseline) !== canonical(attempt.baseline) ||
      canonical(actual.observations) !== canonical(attempt.observations) ||
      attempt.trialId !== actual.evidence.trialId ||
      (attempt.accepted && actual.evidence.outcome !== 'VIOLATED')
    )
      throw new Error('MINIMIZATION EVIDENCE MISMATCH');
  } else if (attempt.accepted)
    throw new Error('MINIMIZATION EVIDENCE REQUIRED');
  const evaluation = {
    findingId: finding.id,
    sourceJourneyId: source.id,
    predicateRef: finding.predicateRef,
    attempt,
    bestJourneyId: best.id,
    bestLength: best.steps.length,
  };
  const safe = vault.sanitize(evaluation as unknown as Json, true);
  if (canonical(safe) !== canonical(evaluation))
    throw new Error('UNSAFE MINIMIZATION EVIDENCE');
  await client.query('BEGIN');
  try {
    const stored = await loadFinding(
      client,
      finding.projectId,
      finding.id,
      true,
    );
    if (
      stored.runId !== run.id ||
      stored.finding.classification !== 'CONFIRMED' ||
      !stored.finding.consistent ||
      !samePredicate(stored.finding.predicateRef, finding.predicateRef)
    )
      throw new Error('STALE FINDING');
    const priorId =
      stored.finding.minimizedJourneyId ?? stored.finding.originalJourneyId;
    const priorRows = await client.query<{ definition: unknown }>(
      'SELECT definition FROM journeys WHERE id=$1 AND run_id=$2',
      [priorId, run.id],
    );
    const prior = JourneySchema.parse(priorRows.rows[0]?.definition);
    if (source.id !== stored.finding.originalJourneyId)
      throw new Error('MINIMIZATION IDENTITY MISMATCH');
    if (attempt.accepted) {
      const predicate = run.predicates.find(
        (p) =>
          p.id === finding.predicateRef.id &&
          p.version === finding.predicateRef.version &&
          p.canonicalHash === finding.predicateRef.hash,
      );
      if (!predicate) throw new Error('MINIMIZATION IDENTITY MISMATCH');
      const removal = prior.steps.findIndex(
        (s) => s.id === attempt.removedStepId,
      );
      const planned = planDeletion(prior, predicate, removal).candidate;
      if (
        !planned ||
        definition(planned) !== definition(attempt.candidate) ||
        canonical(best) !== canonical(attempt.candidate)
      )
        throw new Error('MINIMIZATION EVIDENCE MISMATCH');
    } else if (canonical(best) !== canonical(prior))
      throw new Error('STALE MINIMIZATION BEST');
    await client.query(
      `INSERT INTO evidence(id,run_id,trial_id,kind,predicate_ref,baseline_id,step_refs,evaluation) VALUES($1,$2,$3,'MINIMIZATION ATTEMPT',$4,$5,$6,$7)`,
      [
        randomUUID(),
        run.id,
        attempt.trialId ?? randomUUID(),
        finding.predicateRef,
        attempt.baseline?.id ?? null,
        JSON.stringify(attempt.observations.map((o) => o.id)),
        safe,
      ],
    );
    if (attempt.accepted)
      await client.query(
        'UPDATE findings SET minimized_journey_id=$2 WHERE id=$1',
        [finding.id, best.id],
      );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
export async function finishMinimization(
  client: PoolClient,
  finding: Finding,
  best: Journey,
  stopReason: string,
  locallyIrreducible: boolean,
  vault: SecretVault,
): Promise<Finding> {
  await client.query('BEGIN');
  try {
    const stored = await loadFinding(
      client,
      finding.projectId,
      finding.id,
      true,
    );
    if (
      stored.finding.classification !== 'CONFIRMED' ||
      !stored.finding.consistent ||
      !samePredicate(best.predicateRef, stored.finding.predicateRef)
    )
      throw new Error('STALE FINDING');
    if (
      best.id !==
      (stored.finding.minimizedJourneyId ?? stored.finding.originalJourneyId)
    )
      throw new Error('STALE MINIMIZATION BEST');
    const rows = await client.query<{ definition: unknown }>(
      'SELECT definition FROM journeys WHERE id=$1 AND run_id=$2',
      [best.id, stored.runId],
    );
    if (
      canonical(JourneySchema.parse(rows.rows[0]?.definition)) !==
      canonical(best)
    )
      throw new Error('MINIMIZATION EVIDENCE MISMATCH');
    const evaluation = {
      findingId: finding.id,
      sourceJourneyId: finding.originalJourneyId,
      bestJourneyId: best.id,
      bestLength: best.steps.length,
      predicateRef: finding.predicateRef,
      stopReason,
      locallyIrreducible,
    };
    const safe = vault.sanitize(evaluation as unknown as Json, true);
    if (canonical(safe) !== canonical(evaluation))
      throw new Error('UNSAFE MINIMIZATION EVIDENCE');
    await client.query(
      `INSERT INTO evidence(id,run_id,trial_id,kind,predicate_ref,step_refs,evaluation) VALUES($1,$2,$3,'MINIMIZATION RESULT',$4,'[]',$5)`,
      [randomUUID(), stored.runId, randomUUID(), finding.predicateRef, safe],
    );
    await client.query(
      'UPDATE findings SET minimized_journey_id=$2,minimization_stop=$3 WHERE id=$1',
      [finding.id, best.id, stopReason],
    );
    await client.query('COMMIT');
    return FindingSchema.parse({
      ...stored.finding,
      minimizedJourneyId: best.id,
      minimizationStop: stopReason,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
