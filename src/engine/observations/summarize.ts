import { ObservationSchema, type Observation, type Json } from '../contracts';
import type { SecretVault } from '../secrets/vault';
export function summarize(
  observations: Observation[],
  vault: SecretVault,
): Json {
  const safe = vault.sanitize(
    ObservationSchema.array()
      .parse(observations)
      .map((o) => ({
        id: o.id,
        stepId: o.stepId,
        status: o.result.status ?? null,
        outcome: o.result.outcome,
        truncated: o.result.truncated,
        response: o.result.sanitizedResponse,
      })),
    true,
  );
  if (Buffer.byteLength(JSON.stringify(safe)) > 128 * 1024)
    throw new Error('CONTEXT TOO LARGE');
  return safe;
}
