import { detectCandidate } from '../../engine/detection/candidates';
import {
  FindingSchema,
  type Journey,
  type Evidence,
  type Observation,
} from '../../engine/contracts';
import { loadPredicateApproval } from './predicates';
import {
  Id,
  JsonSchema,
  ObservationSchema,
  JourneySchema,
} from '../../engine/contracts';
import { storeObservation } from '../../engine/observations/store';
import type { SecretVault } from '../../engine/secrets/vault';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  Run,
  RunBudget,
  Json,
  Phase,
  BaselineEvidence,
} from '../../engine/contracts';
export class RunRepository {
  constructor(readonly client: PoolClient) {}
  async recoverInterrupted() {
    await this.client.query(
      "UPDATE runs SET status='INTERRUPTED', stop_reason='PROCESS INTERRUPTED' WHERE status IN ('ACCEPTED','RUNNING','STOPPING')",
    );
  }
  async create(run: Run) {
    await this.client.query(
      'INSERT INTO runs(id,project_id,status,immutable_snapshot,counters,accepted_at,deadline_at,model_config) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        run.id,
        run.projectId,
        run.status,
        {
          apiSnapshot: run.apiSnapshot,
          scope: run.scope,
          reset: run.reset,
          predicates: run.predicates,
          credentialBindings: run.credentialBindings,
        },
        run.budget,
        run.budget.acceptedAt,
        run.budget.deadlineAt,
        run.modelConfiguration,
      ],
    );
  }
  async intent(
    input: {
      id: string;
      runId: string;
      trialId: string;
      stepId: string;
      phase: Phase;
      ordinal: number;
      request: Json;
      journeyId?: string;
    },
    budget: RunBudget,
  ) {
    await this.client.query('BEGIN');
    try {
      const updated = await this.client.query(
        "UPDATE runs SET counters=$2 WHERE id=$1 AND status IN ('ACCEPTED','RUNNING') RETURNING id",
        [input.runId, budget],
      );
      if (updated.rowCount !== 1) throw new Error('RUN NOT ACTIVE');
      await this.client.query(
        'INSERT INTO step_records(id,run_id,trial_id,step_name,phase,ordinal,sanitized_request,journey_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          input.id,
          input.runId,
          input.trialId,
          input.stepId,
          input.phase,
          input.ordinal,
          input.request,
          input.journeyId ?? null,
        ],
      );
      await this.client.query('COMMIT');
    } catch {
      await this.client.query('ROLLBACK');
      throw new Error('STORAGE ERROR');
    }
  }
  async outcome(id: string, result: Json, outcome: string, reason?: string) {
    await this.client.query(
      "UPDATE step_records SET sanitized_response=$2,outcome=$3,error_reason=$4 WHERE id=$1 AND outcome='INTENT'",
      [id, result, outcome, reason ?? null],
    );
  }
  async observation(stepRecordId: string, value: unknown, vault: SecretVault) {
    return storeObservation(this.client, stepRecordId, value, vault);
  }
  async trace(projectId: string, runId: string) {
    Id.parse(projectId);
    Id.parse(runId);
    const run = await this.client.query<{ snapshot: unknown }>(
      `SELECT jsonb_build_object('id',id,'projectId',project_id,'status',status,'stopReason',stop_reason,'configuration',immutable_snapshot,'budget',counters,'modelConfiguration',model_config) AS snapshot FROM runs WHERE id=$1 AND project_id=$2`,
      [runId, projectId],
    );
    if (!run.rows[0]) throw new Error('RUN NOT FOUND');
    const steps = await this.client.query<{ record: unknown }>(
      `SELECT jsonb_build_object('id',id,'trialId',trial_id,'journeyId',journey_id,'stepId',step_name,'phase',phase,'ordinal',ordinal,'request',sanitized_request,'response',sanitized_response,'outcome',outcome,'intentAt',request_intent_at::text) AS record FROM step_records WHERE run_id=$1 ORDER BY request_intent_at,ordinal`,
      [runId],
    );
    const observations = await this.client.query<{
      sanitized_summary: unknown;
    }>(
      'SELECT sanitized_summary FROM observations WHERE run_id=$1 ORDER BY step_record_id',
      [runId],
    );
    const journeys = await this.client.query<{ definition: unknown }>(
      'SELECT definition FROM journeys WHERE run_id=$1 ORDER BY ordinal',
      [runId],
    );
    const evidence = await this.client.query<{ evaluation: unknown }>(
      'SELECT evaluation FROM evidence WHERE run_id=$1 ORDER BY created_at',
      [runId],
    );
    return {
      run: JsonSchema.parse(run.rows[0].snapshot),
      steps: steps.rows.map((row) => JsonSchema.parse(row.record)),
      observations: observations.rows.map((row) =>
        ObservationSchema.parse(row.sanitized_summary),
      ),
      journeys: journeys.rows.map((row) => JourneySchema.parse(row.definition)),
      evidence: evidence.rows.map((row) => JsonSchema.parse(row.evaluation)),
    };
  }
  async baseline(b: BaselineEvidence) {
    await this.client.query(
      "INSERT INTO evidence(id,run_id,trial_id,kind,step_refs,evaluation) VALUES($1,$2,$3,'BASELINE',$4,$5)",
      [
        b.id,
        b.runId,
        b.trialId,
        JSON.stringify([...b.resetStepIds, ...b.checkStepIds]),
        b,
      ],
    );
  }
  async setupFailure(
    runId: string,
    trialId: string,
    stepRefs: string[],
    evaluation: Json,
  ) {
    await this.client.query(
      "INSERT INTO evidence(id,run_id,trial_id,kind,step_refs,evaluation) VALUES($1,$2,$3,'BASELINE FAILURE',$4,$5)",
      [randomUUID(), runId, trialId, JSON.stringify(stepRefs), evaluation],
    );
  }
  async planning(
    runId: string,
    roundId: string,
    kind: 'PLANNING INTENT' | 'PLANNING RESULT',
    evaluation: Json,
    budget: RunBudget,
  ) {
    await this.client.query('BEGIN');
    try {
      await this.client.query('UPDATE runs SET counters=$2 WHERE id=$1', [
        runId,
        budget,
      ]);
      await this.client.query(
        "INSERT INTO evidence(id,run_id,trial_id,kind,step_refs,evaluation) VALUES($1,$2,$3,$4,'[]',$5)",
        [randomUUID(), runId, roundId, kind, evaluation],
      );
      await this.client.query('COMMIT');
    } catch {
      await this.client.query('ROLLBACK');
      throw new Error('STORAGE ERROR');
    }
  }
  async counters(runId: string, budget: RunBudget) {
    await this.client.query('UPDATE runs SET counters=$2 WHERE id=$1', [
      runId,
      budget,
    ]);
  }
  async initialCandidate(
    run: Run,
    journey: Journey,
    evidence: Evidence,
    baseline: BaselineEvidence,
    observations: Observation[],
    vault: SecretVault,
  ) {
    const predicate = run.predicates.find(
      (p) => p.id === evidence.predicateRef.id,
    );
    const approved = predicate?.approvalRef
      ? await loadPredicateApproval(
          this.client,
          run.projectId,
          evidence.predicateRef,
          predicate.approvalRef,
        )
      : new Set<string>();
    const candidate = detectCandidate(
      run,
      journey,
      evidence,
      baseline,
      observations,
      approved,
    );
    if (!candidate) return null;
    const safe = FindingSchema.parse(
      vault.sanitize(candidate as unknown as Json, true),
    );
    await this.client.query('BEGIN');
    try {
      const source = await this.client.query(
        `SELECT e.id FROM evidence e JOIN runs r ON r.id=e.run_id
         JOIN evidence b ON b.id=e.baseline_id JOIN journeys j ON j.id=$4
         WHERE e.id=$1 AND r.id=$2 AND r.project_id=$3 AND e.kind='PREDICATE'
         AND e.evaluation=$5::jsonb AND b.evaluation=$6::jsonb AND b.kind='BASELINE'
         AND b.run_id=r.id AND b.trial_id=e.trial_id AND j.run_id=r.id
         AND j.phase='EXPLORATION' AND j.definition=$7::jsonb
         AND r.immutable_snapshot->'predicates'=$11::jsonb
         AND r.immutable_snapshot->'scope'=$12::jsonb
         AND (SELECT count(*) FROM observations o JOIN step_records s ON s.id=o.step_record_id
              WHERE o.id=ANY($8::uuid[]) AND o.run_id=r.id AND o.trial_id=e.trial_id
              AND s.journey_id=j.id AND s.phase='EXPLORATION'
              AND EXISTS(SELECT 1 FROM jsonb_array_elements($10::jsonb) expected
                         WHERE expected=o.sanitized_summary))=$9
         FOR UPDATE OF e`,
        [
          evidence.id,
          run.id,
          run.projectId,
          journey.id,
          evidence,
          baseline,
          journey,
          evidence.observationIds,
          evidence.observationIds.length,
          JSON.stringify(observations),
          JSON.stringify(run.predicates),
          run.scope,
        ],
      );
      if (source.rowCount !== 1) throw new Error('CANDIDATE EVIDENCE MISMATCH');
      const existing = await this.client.query<{ id: string }>(
        'SELECT id FROM findings WHERE initial_evidence_id=$1 AND run_id=$2',
        [evidence.id, run.id],
      );
      if (existing.rows.length) {
        await this.client.query('COMMIT');
        return { ...safe, id: existing.rows[0]!.id };
      }
      await this.client.query(
        'INSERT INTO findings(id,project_id,run_id,predicate_ref,initial_evidence_id,original_journey_id,current_classification) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          safe.id,
          safe.projectId,
          run.id,
          safe.predicateRef,
          safe.initialEvidenceId,
          safe.originalJourneyId,
          safe.classification,
        ],
      );
      await this.client.query(
        'INSERT INTO finding_transitions(id,finding_id,prior_classification,next_classification,evidence_refs,reason) VALUES($1,$2,NULL,$3,$4,$5)',
        [
          randomUUID(),
          safe.id,
          safe.classification,
          JSON.stringify([safe.initialEvidenceId]),
          (safe.transitions[0] as { reason: string }).reason,
        ],
      );
      await this.client.query('COMMIT');
      return safe;
    } catch (error) {
      await this.client.query('ROLLBACK');
      if (
        error instanceof Error &&
        error.message === 'CANDIDATE EVIDENCE MISMATCH'
      )
        throw error;
      throw new Error('STORAGE ERROR');
    }
  }
  async stop(runId: string, reason: string, status = 'STOPPED') {
    await this.client.query(
      "UPDATE runs SET status=$2,stop_reason=$3 WHERE id=$1 AND status IN ('ACCEPTED','RUNNING','STOPPING')",
      [runId, status, reason],
    );
  }
}
