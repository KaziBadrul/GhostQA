import type { PoolClient } from 'pg';
import { Id, ObservationSchema, type Json } from '../contracts';
import type { SecretVault } from '../secrets/vault';
export async function storeObservation(
  client: PoolClient,
  stepRecordId: string,
  value: unknown,
  vault: SecretVault,
) {
  Id.parse(stepRecordId);
  const observation = ObservationSchema.parse(value);
  const safe = ObservationSchema.parse(
    vault.sanitize(observation as unknown as Json, true),
  );
  if (safe.stepId !== safe.result.stepId)
    throw new Error('OBSERVATION STEP MISMATCH');
  const inserted = await client.query(
    `INSERT INTO observations(id,run_id,trial_id,step_record_id,sanitized_summary,provenance_mappings)
 SELECT $1,$2,$3,$4,$5,$6 FROM step_records WHERE id=$4 AND run_id=$2 AND trial_id=$3 AND step_name=$7`,
    [
      safe.id,
      safe.runId,
      safe.trialId,
      stepRecordId,
      safe,
      JSON.stringify(safe.stateMappings),
      safe.stepId,
    ],
  );
  if (inserted.rowCount !== 1)
    throw new Error('OBSERVATION REFERENCE MISMATCH');
  return safe;
}
