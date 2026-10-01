import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import {
  BaselineEvidenceSchema,
  EvidenceSchema,
  FindingSchema,
  JourneySchema,
  ObservationSchema,
  RunSchema,
  Id,
  type Finding,
  type Journey,
  type Json,
  type Run,
} from '../../engine/contracts';
import { canonical } from '../../engine/detection/predicate';
import {
  transitionFinding,
  validateVerification,
  inconclusiveVerification,
  samePredicate,
  type VerificationInput,
} from '../../engine/detection/findings';
import { loadPredicateApproval } from './predicates';
import { SecretVault } from '../../engine/secrets/vault';

export async function loadFinding(
  client: PoolClient,
  projectId: string,
  findingId: string,
  lock = false,
) {
  Id.parse(projectId);
  Id.parse(findingId);
  const result = await client.query<{ value: unknown; run_id: string }>(
    `SELECT run_id,jsonb_strip_nulls(jsonb_build_object('id',id,'projectId',project_id,'initialEvidenceId',initial_evidence_id,
     'predicateRef',predicate_ref,'classification',current_classification,'consistent',consistent,
     'originalJourneyId',original_journey_id,'minimizedJourneyId',minimized_journey_id,'minimizationStop',minimization_stop)) AS value FROM findings WHERE id=$1 AND project_id=$2 ${lock ? 'FOR UPDATE' : ''}`,
    [findingId, projectId],
  );
  const row = result.rows[0];
  if (!row) throw new Error('FINDING NOT FOUND');
  const transitions = await client.query<{ value: unknown }>(
    `SELECT jsonb_build_object('prior',prior_classification,'next',next_classification,
     'evidenceRefs',evidence_refs,'reason',reason) AS value FROM finding_transitions
     WHERE finding_id=$1 ORDER BY created_at,id`,
    [findingId],
  );
  const replay = await client.query<{ id: string }>(
    `SELECT e.id FROM finding_transitions t CROSS JOIN LATERAL jsonb_array_elements_text(t.evidence_refs) ref
     JOIN evidence e ON e.id::text=ref.value WHERE t.finding_id=$1 AND e.kind='PREDICATE'
     AND e.evaluation->>'phase'='REPLAY' ORDER BY t.created_at,t.id,e.id`,
    [findingId],
  );
  const value = z.record(z.string(), z.unknown()).parse(row.value);
  const finding = FindingSchema.parse({
    ...value,
    transitions: transitions.rows.map((t) => t.value),
    replayEvidenceIds: [...new Set(replay.rows.map((e) => e.id))],
  });
  return { finding, runId: Id.parse(row.run_id) };
}
export async function loadFindingRun(
  client: PoolClient,
  runId: string,
  projectId: string,
): Promise<Run> {
  const result = await client.query<{ value: unknown }>(
    `SELECT immutable_snapshot || jsonb_build_object('id',id,'projectId',project_id,'status',status,
     'budget',counters,'modelConfiguration',model_config) AS value FROM runs WHERE id=$1 AND project_id=$2`,
    [Id.parse(runId), Id.parse(projectId)],
  );
  if (!result.rows[0]) throw new Error('RUN NOT FOUND');
  return RunSchema.parse(result.rows[0].value);
}
export async function loadFindingJourney(
  client: PoolClient,
  run: Run,
  finding: Finding,
): Promise<Journey> {
  const result = await client.query<{ definition: unknown }>(
    "SELECT definition FROM journeys WHERE id=$1 AND run_id=$2 AND phase='EXPLORATION'",
    [finding.originalJourneyId, run.id],
  );
  if (!result.rows[0]) throw new Error('FINDING JOURNEY NOT FOUND');
  const journey = JourneySchema.parse(result.rows[0].definition);
  if (!samePredicate(journey.predicateRef, finding.predicateRef))
    throw new Error('VERIFICATION IDENTITY MISMATCH');
  return journey;
}
export async function loadTrialEvidence(
  client: PoolClient,
  run: Run,
  id: string,
  phase: 'EXPLORATION' | 'REPLAY' | 'MINIMIZATION' | 'ARTIFACT',
  journey: Journey,
) {
  const result = await client.query<{ evaluation: unknown; baseline: unknown }>(
    `SELECT e.evaluation,b.evaluation AS baseline FROM evidence e JOIN evidence b ON b.id=e.baseline_id
     WHERE e.id=$1 AND e.run_id=$2 AND e.kind='PREDICATE' AND b.kind='BASELINE'
     AND b.run_id=e.run_id AND b.trial_id=e.trial_id`,
    [Id.parse(id), run.id],
  );
  if (!result.rows[0]) throw new Error('VERIFICATION EVIDENCE MISMATCH');
  const evidence = EvidenceSchema.parse(result.rows[0].evaluation);
  const baseline = BaselineEvidenceSchema.parse(result.rows[0].baseline);
  const rows = await client.query<{ sanitized_summary: unknown }>(
    `SELECT o.sanitized_summary FROM observations o JOIN step_records s ON s.id=o.step_record_id
     JOIN journeys j ON j.id=s.journey_id WHERE o.id=ANY($1::uuid[]) AND o.run_id=$2 AND o.trial_id=$3
     AND s.run_id=o.run_id AND s.trial_id=o.trial_id AND s.phase=$4 AND s.outcome='RESPONSE'
     AND j.run_id=$2 AND j.definition-'id'=$5::jsonb-'id' ORDER BY s.ordinal`,
    [evidence.observationIds, run.id, evidence.trialId, phase, journey],
  );
  const observations = rows.rows.map((o) =>
    ObservationSchema.parse(o.sanitized_summary),
  );
  const setup = await client.query<{
    step_name: string;
    phase: string;
    outcome: string;
    sanitized_response: unknown;
  }>(
    `SELECT step_name,phase,outcome,sanitized_response FROM step_records
     WHERE run_id=$1 AND trial_id=$2 AND phase IN ('RESET','BASELINE') ORDER BY ordinal`,
    [run.id, evidence.trialId],
  );
  const controls = [
    ...run.reset.resetSteps.map((step) => ({ step, phase: 'RESET' })),
    ...run.reset.checkSteps.map((step) => ({ step, phase: 'BASELINE' })),
  ];
  if (
    setup.rows.length !== controls.length ||
    setup.rows.some((row, index) => {
      const control = controls[index]!;
      const response = z
        .object({ status: z.number().int(), truncated: z.literal(false) })
        .safeParse(row.sanitized_response);
      return (
        row.step_name !== control.step.id ||
        row.phase !== control.phase ||
        row.outcome !== 'RESPONSE' ||
        !response.success ||
        !control.step.expectedStatuses.includes(response.data.status)
      );
    })
  )
    throw new Error('VERIFICATION BASELINE MISMATCH');
  if (
    evidence.phase !== phase ||
    !samePredicate(evidence.predicateRef, journey.predicateRef) ||
    observations.length !== evidence.observationIds.length ||
    observations.length !== journey.steps.length ||
    observations.some((o, index) => o.stepId !== journey.steps[index]!.id)
  )
    throw new Error('VERIFICATION EVIDENCE MISMATCH');
  return { evidence, baseline, observations };
}
export async function verificationApprovals(
  client: PoolClient,
  run: Run,
  finding: Finding,
) {
  const predicate = run.predicates.find(
    (p) =>
      p.id === finding.predicateRef.id &&
      p.version === finding.predicateRef.version &&
      p.canonicalHash === finding.predicateRef.hash,
  );
  if (!predicate) throw new Error('VERIFICATION IDENTITY MISMATCH');
  const approvals = predicate.approvalRef
    ? await loadPredicateApproval(
        client,
        run.projectId,
        finding.predicateRef,
        predicate.approvalRef,
        run.budget.acceptedAt,
      )
    : new Set<string>();
  return {
    predicate,
    initialApprovals: approvals,
    replayApprovals: approvals,
    specificationAssertions: new Map<string, string>(),
  };
}
async function append(
  client: PoolClient,
  old: Finding,
  next: Finding,
  vault: SecretVault,
) {
  const safe = FindingSchema.parse(
    vault.sanitize(next as unknown as Json, true),
  );
  if (canonical(safe) !== canonical(next))
    throw new Error('UNSAFE FINDING TRANSITION');
  for (const t of safe.transitions.slice(old.transitions.length)) {
    const transition = z
      .object({
        prior: z.string().nullable(),
        next: z.string(),
        evidenceRefs: z.array(z.string()),
        reason: z.string(),
      })
      .parse(t);
    await client.query(
      'INSERT INTO finding_transitions(id,finding_id,prior_classification,next_classification,evidence_refs,reason) VALUES($1,$2,$3,$4,$5,$6)',
      [
        randomUUID(),
        safe.id,
        transition.prior,
        transition.next,
        JSON.stringify(transition.evidenceRefs),
        transition.reason,
      ],
    );
  }
  await client.query(
    'UPDATE findings SET current_classification=$2,consistent=$3 WHERE id=$1',
    [safe.id, safe.classification, safe.consistent],
  );
  return safe;
}
const normalizedObservations = (
  value: VerificationInput['initial']['observations'],
) => canonical([...value].sort((a, b) => a.id.localeCompare(b.id)));
export async function recordVerification(
  client: PoolClient,
  input: VerificationInput,
  vault: SecretVault,
): Promise<Finding> {
  // Reject malformed references before mutation. Durable records, not caller-supplied
  // approvals or model data, determine production eligibility and history.
  const parsed = validateVerification(input);
  await client.query('BEGIN');
  try {
    const stored = await loadFinding(
      client,
      parsed.run.projectId,
      parsed.finding.id,
      true,
    );
    if (
      canonical(stored.finding) !== canonical(parsed.finding) ||
      stored.runId !== parsed.run.id
    )
      throw new Error('STALE FINDING');
    const run = await loadFindingRun(
      client,
      stored.runId,
      stored.finding.projectId,
    );
    if (
      canonical(run.predicates) !== canonical(parsed.run.predicates) ||
      canonical(run.reset) !== canonical(parsed.run.reset) ||
      canonical(run.scope) !== canonical(parsed.run.scope)
    )
      throw new Error('VERIFICATION RUN MISMATCH');
    const journey = await loadFindingJourney(client, run, stored.finding);
    const initial = await loadTrialEvidence(
      client,
      run,
      stored.finding.initialEvidenceId,
      'EXPLORATION',
      journey,
    );
    const replay = await loadTrialEvidence(
      client,
      run,
      parsed.replay.id,
      'REPLAY',
      journey,
    );
    for (const [expected, actual] of [
      [input.initial, initial],
      [input.replay, replay],
    ] as const) {
      if (
        canonical(expected.evidence) !== canonical(actual.evidence) ||
        canonical(expected.baseline) !== canonical(actual.baseline) ||
        normalizedObservations(expected.observations) !==
          normalizedObservations(actual.observations)
      )
        throw new Error('VERIFICATION EVIDENCE MISMATCH');
    }
    const eligibility = await verificationApprovals(
      client,
      run,
      stored.finding,
    );
    const next = transitionFinding({
      run,
      finding: stored.finding,
      ...eligibility,
      initial,
      replay,
    });
    const safe = await append(client, stored.finding, next, vault);
    await client.query('COMMIT');
    return safe;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
export async function recordVerificationFailure(
  client: PoolClient,
  projectId: string,
  findingId: string,
  reason: string,
): Promise<Finding> {
  // Reasons are engine stop codes, never raw target/model exceptions.
  const code = z
    .enum([
      'BUDGET EXHAUSTED',
      'TIME EXHAUSTED',
      'CANCELLED',
      'BASELINE ERROR',
      'EXECUTION ERROR',
      'OWNERSHIP LOST',
      'STORAGE ERROR',
      'WORKER ERROR',
      'SHUTDOWN',
    ])
    .parse(reason);
  await client.query('BEGIN');
  try {
    const { finding } = await loadFinding(client, projectId, findingId, true);
    const next = inconclusiveVerification(
      finding,
      `VERIFICATION STOPPED: ${code}`,
    );
    const vault = new SecretVault();
    try {
      await append(client, finding, next, vault);
    } finally {
      vault.discard();
    }
    await client.query('COMMIT');
    return next;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
