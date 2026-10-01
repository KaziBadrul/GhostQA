import type { PoolClient } from 'pg';
import { EvidenceSchema, type Json } from '../../engine/contracts';
import type { SecretVault } from '../../engine/secrets/vault';
export async function saveEvidence(
  client: PoolClient,
  value: unknown,
  vault: SecretVault,
) {
  const evidence = EvidenceSchema.parse(value);
  const safe = EvidenceSchema.parse(
    vault.sanitize(evidence as unknown as Json, true),
  );
  if (
    safe.observationIds.length === 0 ||
    new Set(safe.observationIds).size !== safe.observationIds.length
  )
    throw new Error('EVIDENCE OBSERVATIONS REQUIRED');
  const inserted = await client.query(
    `INSERT INTO evidence(id,run_id,trial_id,kind,predicate_ref,baseline_id,step_refs,evaluation)
 SELECT $1,$2,$3,'PREDICATE',$4,$5,$6,$7 FROM evidence baseline
 WHERE baseline.id=$5 AND baseline.run_id=$2 AND baseline.trial_id=$3 AND baseline.kind='BASELINE' AND baseline.evaluation->>'verdict'='SATISFIED'
 AND EXISTS(SELECT 1 FROM runs r,jsonb_array_elements(r.immutable_snapshot->'predicates') p WHERE r.id=$2 AND p->>'id'=$10 AND p->>'version'=$11 AND p->>'canonicalHash'=$12)
 AND EXISTS(SELECT 1 FROM observations o JOIN step_records s ON s.id=o.step_record_id WHERE o.id=ANY($8::uuid[]) AND o.run_id=$2 AND o.trial_id=$3 AND s.phase=$13)
 AND (SELECT count(*) FROM observations WHERE id=ANY($8::uuid[]) AND run_id=$2 AND trial_id=$3)=$9`,
    [
      safe.id,
      safe.runId,
      safe.trialId,
      safe.predicateRef,
      safe.baselineEvidenceId,
      JSON.stringify(safe.observationIds),
      safe,
      safe.observationIds,
      safe.observationIds.length,
      safe.predicateRef.id,
      String(safe.predicateRef.version),
      safe.predicateRef.hash,
      safe.phase,
    ],
  );
  if (inserted.rowCount !== 1) throw new Error('EVIDENCE REFERENCE MISMATCH');
  return safe;
}
