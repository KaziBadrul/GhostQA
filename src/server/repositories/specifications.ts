import type { PoolClient } from 'pg';
import type { ApiModel, Json } from '../../engine/contracts';
import type { SecretVault } from '../../engine/secrets/vault';
import { sanitizeDocument } from '../../engine/openapi/sanitize';
import { createHash } from 'node:crypto';
export async function saveSpecification(
  client: PoolClient,
  projectId: string,
  model: ApiModel,
  document: Json,
  vault: SecretVault,
) {
  const sanitized = sanitizeDocument(document, vault),
    safeModel = sanitizeDocument(model as unknown as Json, vault, true);
  await client.query(
    'INSERT INTO specifications(id,project_id,sanitized_document,sanitized_hash,openapi_version,api_model,diagnostics) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [
      model.snapshotId,
      projectId,
      sanitized,
      createHash('sha256').update(JSON.stringify(sanitized)).digest('hex'),
      model.openapiVersion,
      safeModel,
      JSON.stringify(vault.sanitize(model.importDiagnostics)),
    ],
  );
}
