import { hypothesisHash } from '../../engine/mapping/state';
import type { PoolClient } from 'pg';
import {
  Id,
  PhaseSchema,
  JourneySchema,
  type Json,
  type Phase,
} from '../../engine/contracts';
import { canonical } from '../../engine/detection/predicate';
import type { SecretVault } from '../../engine/secrets/vault';
export async function saveJourney(
  client: PoolClient,
  runId: string,
  phase: Phase,
  value: unknown,
  ordinal: number,
  vault: SecretVault,
) {
  Id.parse(runId);
  PhaseSchema.parse(phase);
  if (!Number.isInteger(ordinal) || ordinal < 0)
    throw new Error('INVALID JOURNEY ORDINAL');
  const journey = JourneySchema.parse(value);
  const safe = JourneySchema.parse(vault.sanitize(journey as unknown as Json));
  const inserted = await client.query(
    'INSERT INTO journeys(id,run_id,phase,definition,normalized_hash,ordinal) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',
    [safe.id, runId, phase, safe, hypothesisHash(safe), ordinal],
  );
  if (inserted.rowCount === 0) {
    const existing = await client.query<{
      run_id: string;
      definition: unknown;
    }>('SELECT run_id,definition FROM journeys WHERE id=$1', [safe.id]);
    const row = existing.rows[0];
    if (
      !row ||
      row.run_id !== runId ||
      canonical(JourneySchema.parse(row.definition)) !== canonical(safe)
    )
      throw new Error('IMMUTABLE JOURNEY MISMATCH');
  }
  return safe;
}
