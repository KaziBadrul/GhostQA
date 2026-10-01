import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import {
  Id,
  PredicateRefSchema,
  type Json,
  type Predicate,
} from '../../engine/contracts';
import { validatePredicate } from '../../engine/validation/predicate';
import type { SecretVault } from '../../engine/secrets/vault';

export async function savePredicate(
  client: PoolClient,
  projectId: string,
  value: unknown,
  vault: SecretVault,
) {
  Id.parse(projectId);
  const p = validatePredicate(value);
  // Approval records are append-only decisions, not edits to stored definitions.
  if (p.approvalRef !== undefined)
    throw new Error('APPROVAL STORED SEPARATELY');
  const safe = vault.sanitize(p as unknown as Json);
  if (JSON.stringify(safe) !== JSON.stringify(p))
    throw new Error('SECRET PREDICATE LITERAL');
  const inserted = await client.query(
    `INSERT INTO predicates(id,project_id,version,canonical_hash,definition,source_ref)
     SELECT $1,$2,$3,$4,$5,$6 WHERE $3 = COALESCE(
       (SELECT max(version) FROM predicates WHERE id=$1 AND project_id=$2),0)+1`,
    [p.id, projectId, p.version, p.canonicalHash, p, p.sourceRef],
  );
  if (inserted.rowCount !== 1) throw new Error('INVALID PREDICATE VERSION');
  return p;
}

export async function loadPredicate(
  client: PoolClient,
  projectId: string,
  reference: unknown,
): Promise<Predicate> {
  Id.parse(projectId);
  const ref = PredicateRefSchema.parse(reference);
  const result = await client.query<{ definition: unknown }>(
    'SELECT definition FROM predicates WHERE project_id=$1 AND id=$2 AND version=$3 AND canonical_hash=$4',
    [projectId, ref.id, ref.version, ref.hash],
  );
  if (!result.rows[0]) throw new Error('PREDICATE NOT FOUND');
  const p = validatePredicate(result.rows[0].definition);
  if (
    p.id !== ref.id ||
    p.version !== ref.version ||
    p.canonicalHash !== ref.hash
  )
    throw new Error('PREDICATE IDENTITY MISMATCH');
  return p;
}

// Only the developer approval boundary may call this; model output never reaches it.
export async function approvePredicate(
  client: PoolClient,
  projectId: string,
  reference: unknown,
) {
  const p = await loadPredicate(client, projectId, reference);
  const id = randomUUID();
  await client.query(
    "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'PREDICATE',$3,$4)",
    [id, projectId, p.canonicalHash, { predicateId: p.id, version: p.version }],
  );
  return id;
}

export async function loadPredicateApproval(
  client: PoolClient,
  projectId: string,
  reference: unknown,
  approvalId: string,
  acceptedAt?: string,
): Promise<ReadonlySet<string>> {
  const p = await loadPredicate(client, projectId, reference);
  Id.parse(approvalId);
  const result = await client.query(
    `SELECT id FROM approvals WHERE id=$1 AND project_id=$2 AND kind='PREDICATE'
     AND subject_hash=$3 AND details->>'predicateId'=$4 AND details->>'version'=$5
     AND ($6::timestamptz IS NULL OR approved_at <= $6::timestamptz)`,
    [
      approvalId,
      projectId,
      p.canonicalHash,
      p.id,
      String(p.version),
      acceptedAt ?? null,
    ],
  );
  return new Set(result.rows.length === 1 ? [approvalId] : []);
}
