import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { Json, Run } from '../../engine/contracts';
import { canonical } from '../../engine/detection/predicate';
import {
  ArtifactVerificationSchema,
  type ArtifactVerification,
  type GeneratedExport,
} from '../../engine/exports/contracts';
import { SecretVault } from '../../engine/secrets/vault';
import { RunSupervisor, supervisorLockId } from '../run-supervisor';
import { loadFinding, loadTrialEvidence } from './findings';

export async function registerArtifact(
  client: PoolClient,
  generated: GeneratedExport,
) {
  const { artifact, bytes } = generated;
  await client.query(
    `INSERT INTO artifacts(id,finding_id,format,content_hash,runner_version,content,generated_at,verification_status,evidence_refs)
     VALUES($1,$2,'MANIFEST',$3,$4,$5,$6,'UNVERIFIED','[]') ON CONFLICT(id) DO NOTHING`,
    [
      artifact.id,
      artifact.findingId,
      artifact.contentHash,
      artifact.runnerVersion,
      Buffer.from(bytes, 'utf8'),
      artifact.generatedAt,
    ],
  );
  const rows = await client.query<{
    finding_id: string;
    format: string;
    content_hash: string;
    runner_version: string;
    content: Buffer;
    generated_at: Date;
    verification_status: string;
  }>('SELECT * FROM artifacts WHERE id=$1', [artifact.id]);
  const row = rows.rows[0];
  if (
    !row ||
    row.finding_id !== artifact.findingId ||
    row.format !== 'MANIFEST' ||
    row.content_hash !== artifact.contentHash ||
    row.runner_version !== artifact.runnerVersion ||
    row.content.toString('utf8') !== bytes ||
    row.generated_at.toISOString() !==
      new Date(artifact.generatedAt).toISOString() ||
    row.verification_status !== 'UNVERIFIED'
  )
    throw new Error('ARTIFACT IDENTITY MISMATCH');
}
// Only the actual originating supervisor may authorize this commit. Querying the
// held lock does NOT acquire another lock, restore authority or create a dispatcher.
export async function assertArtifactCommitAuthority(
  supervisor: RunSupervisor,
  run: Run,
  trialId: string,
  baselineId: string,
) {
  supervisor.assertTrial(trialId, baselineId);
  if (supervisor.snapshot.id !== run.id)
    throw new Error('ARTIFACT RUN MISMATCH');
  // Reuse row locking to serialize durable cancellation/status changes with
  // this transaction. Local cancellation still closes the supervisor gate now.
  await supervisor.client.query('SELECT id FROM runs WHERE id=$1 FOR UPDATE', [
    run.id,
  ]);
  supervisor.assertTrial(trialId, baselineId);
  const result = await supervisor.client.query<{
    owned: boolean;
    active: boolean;
  }>(
    `SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid()
     AND classid=0 AND objid=$2::oid AND objsubid=1 AND granted) AS owned,
     EXISTS(SELECT 1 FROM runs WHERE id=$1 AND status IN ('ACCEPTED','RUNNING')
       AND cancel_at IS NULL AND deadline_at>clock_timestamp()) AS active`,
    [run.id, supervisorLockId],
  );
  supervisor.assertTrial(trialId, baselineId);
  if (!result.rows[0]?.owned) {
    supervisor.closeGate('OWNERSHIP LOST');
    throw new Error('OWNERSHIP LOST');
  }
  if (!result.rows[0].active) throw new Error('EXECUTION ERROR');
}
export async function recordArtifactVerification(
  supervisor: RunSupervisor,
  run: Run,
  generated: GeneratedExport,
  input: ArtifactVerification,
  vault: SecretVault,
) {
  const audit = ArtifactVerificationSchema.parse(input),
    { artifact } = generated;
  const safe = vault.sanitize(audit as unknown as Json, true);
  if (
    canonical(safe) !== canonical(audit) ||
    audit.artifactId !== artifact.id ||
    audit.manifestHash !== artifact.manifestHash ||
    canonical(audit.predicateRef) !==
      canonical(generated.manifest.predicateRef) ||
    audit.sourceJourneyId !== generated.manifest.journey.id ||
    (audit.evidence && audit.trialId !== audit.evidence.trialId) ||
    (audit.baseline && audit.trialId !== audit.baseline.trialId)
  )
    throw new Error('ARTIFACT EVIDENCE MISMATCH');
  const client = supervisor.client;
  await client.query('BEGIN');
  try {
    const stored = await loadFinding(
      client,
      run.projectId,
      artifact.findingId,
      true,
    );
    if (
      stored.runId !== run.id ||
      stored.finding.classification !== 'CONFIRMED' ||
      !stored.finding.consistent ||
      canonical(stored.finding.predicateRef) !==
        canonical(audit.predicateRef) ||
      (stored.finding.minimizedJourneyId ??
        stored.finding.originalJourneyId) !== audit.sourceJourneyId
    )
      throw new Error('ARTIFACT SOURCE MISMATCH');
    const rows = await client.query<{
      content: Buffer;
      content_hash: string;
      verification_status: string;
      evidence_refs: unknown;
    }>(
      'SELECT content,content_hash,verification_status,evidence_refs FROM artifacts WHERE id=$1 AND finding_id=$2 FOR UPDATE',
      [artifact.id, artifact.findingId],
    );
    const row = rows.rows[0];
    if (
      !row ||
      row.content.toString('utf8') !== generated.bytes ||
      row.content_hash !== artifact.contentHash ||
      row.verification_status !== 'UNVERIFIED'
    )
      throw new Error('ARTIFACT IDENTITY MISMATCH');
    if (audit.evidence) {
      const actual = await loadTrialEvidence(
        client,
        run,
        audit.evidence.id,
        'ARTIFACT',
        generated.manifest.journey,
      );
      if (
        canonical(actual.evidence) !== canonical(audit.evidence) ||
        canonical(actual.baseline) !== canonical(audit.baseline)
      )
        throw new Error('ARTIFACT EVIDENCE MISMATCH');
    }
    if (audit.verified) {
      if (
        !audit.evidence ||
        !audit.baseline ||
        !audit.provenance ||
        !audit.verifiedAt ||
        audit.evidence.outcome !== 'VIOLATED' ||
        audit.provenance.runId !== run.id ||
        audit.provenance.manifestHash !== artifact.manifestHash ||
        !audit.evaluations.some(
          (e) =>
            e.outcome === 'VIOLATED' &&
            audit.intendedAssertionIds.includes(e.assertionId),
        )
      )
        throw new Error('INTENDED ASSERTION NOT REPRODUCED');
      const assertionIds = generated.manifest.assertions.map(
        (_, index) =>
          `${generated.manifest.predicate.id}:${generated.manifest.predicate.version}:${generated.manifest.predicate.canonicalHash}:assertion:${index}`,
      );
      if (
        canonical(audit.evaluations.map((e) => e.assertionId)) !==
          canonical(assertionIds) ||
        canonical(audit.provenance.assertionIds) !== canonical(assertionIds) ||
        audit.intendedAssertionIds.some((id) => !assertionIds.includes(id))
      )
        throw new Error('ARTIFACT ASSERTION IDENTITY MISMATCH');
      await assertArtifactCommitAuthority(
        supervisor,
        run,
        audit.evidence.trialId,
        audit.baseline.id,
      );
    }
    const id = randomUUID();
    await client.query(
      `INSERT INTO evidence(id,run_id,trial_id,kind,predicate_ref,baseline_id,step_refs,evaluation)
       VALUES($1,$2,$3,'ARTIFACT VERIFICATION',$4,$5,$6,$7)`,
      [
        id,
        run.id,
        audit.trialId ?? randomUUID(),
        audit.predicateRef,
        audit.baseline?.id ?? null,
        JSON.stringify(audit.evidence?.observationIds ?? []),
        safe,
      ],
    );
    const refs = z.array(z.uuid()).parse(row.evidence_refs);
    refs.push(id);
    if (audit.evidence) refs.push(audit.evidence.id);
    const updated = await client.query(
      `UPDATE artifacts SET verification_status=$2,evidence_refs=$3 WHERE id=$1
       AND (NOT $4::boolean OR (
         EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid()
           AND classid=0 AND objid=$6::oid AND objsubid=1 AND granted)
         AND EXISTS(SELECT 1 FROM runs WHERE id=$5 AND status IN ('ACCEPTED','RUNNING')
           AND cancel_at IS NULL AND deadline_at>clock_timestamp())))`,
      [
        artifact.id,
        audit.verified ? 'VERIFIED' : 'UNVERIFIED',
        JSON.stringify(refs),
        audit.verified,
        run.id,
        supervisorLockId,
      ],
    );
    if (updated.rowCount !== 1) {
      if (audit.verified)
        await assertArtifactCommitAuthority(
          supervisor,
          run,
          audit.evidence!.trialId,
          audit.baseline!.id,
        );
      throw new Error('STORAGE ERROR');
    }
    if (audit.verified) {
      // Catch cancellation/lock loss during any persistence await, including
      // the status write. No await separates the final gate and COMMIT submission.
      await assertArtifactCommitAuthority(
        supervisor,
        run,
        audit.evidence!.trialId,
        audit.baseline!.id,
      );
      supervisor.assertTrial(audit.evidence!.trialId, audit.baseline!.id);
    }
    await client.query('COMMIT');
    return id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
