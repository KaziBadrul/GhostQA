import { expect, test, vi } from 'vitest';
import { generateManifest } from '../../src/engine/exports/manifest';
import { verifyArtifact } from '../../src/engine/exports/verify';
import { exportHarness } from '../helpers/artifact';
import { supervisorLockId } from '../../src/server/run-supervisor';

for (const loss of [
  'CANCELLED',
  'OWNERSHIP LOST',
  'actual advisory lock',
] as const)
  test(`${loss} during artifact status write rolls back VERIFIED at commit gate`, async () => {
    const h = await exportHarness();
    try {
      const g = generateManifest(h.input),
        query = h.client.query.bind(h.client);
      let injected = false;
      // Inject after the pending status write while its transaction is uncommitted.
      const intercepted = async (text: string, values?: unknown[]) => {
        const result = await query(text, values);
        if (!injected && text.startsWith('UPDATE artifacts SET')) {
          injected = true;
          if (loss === 'CANCELLED') h.s.cancel();
          else if (loss === 'OWNERSHIP LOST') h.s.closeGate(loss);
          else await query('SELECT pg_advisory_unlock($1)', [supervisorLockId]);
        }
        return result;
      };
      vi.spyOn(h.client, 'query').mockImplementation(
        intercepted as typeof h.client.query,
      );
      const r = await verifyArtifact(h.s, h.run, g);
      expect(injected).toBe(true);
      expect(r.artifact.verification).toBe('UNVERIFIED');
      expect(r.reason).toBe(
        loss === 'actual advisory lock' ? 'OWNERSHIP LOST' : loss,
      );
      const rows = await query(
        'SELECT verification_status,evidence_refs FROM artifacts WHERE id=$1',
        [g.artifact.id],
      );
      expect(rows.rows[0].verification_status).toBe('UNVERIFIED');
      const audits = await query(
        "SELECT evaluation FROM evidence WHERE run_id=$1 AND kind='ARTIFACT VERIFICATION'",
        [h.run.id],
      );
      expect(audits.rows).toHaveLength(1);
      expect(audits.rows[0].evaluation.verified).toBe(false);
      expect(h.s.snapshot.budget.usedRequests).toBe(39);
      expect(() => h.s.assertAuthority()).toThrow();
      expect(() => h.s.admitTrial(g.manifest.journey, 'ARTIFACT')).toThrow();
    } finally {
      vi.restoreAllMocks();
      await h.close();
    }
  });
test('persisted exact artifact content and verification audit history cannot be changed or deleted', async () => {
  const h = await exportHarness();
  try {
    const g = generateManifest(h.input),
      r = await verifyArtifact(h.s, h.run, g);
    expect(r.artifact.verification).toBe('VERIFIED');
    for (const sql of [
      "UPDATE artifacts SET content='changed'::bytea WHERE id=$1",
      "UPDATE artifacts SET content_hash=repeat('0',64) WHERE id=$1",
      "UPDATE artifacts SET verification_status='UNVERIFIED' WHERE id=$1",
      "UPDATE artifacts SET evidence_refs='[]' WHERE id=$1",
      'DELETE FROM artifacts WHERE id=$1',
    ])
      await expect(h.client.query(sql, [g.artifact.id])).rejects.toThrow();
    const dispatch = vi.spyOn(h.s, 'dispatchIntent');
    await expect(verifyArtifact(h.s, h.run, g)).rejects.toThrow(
      'ARTIFACT IDENTITY MISMATCH',
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(h.s.snapshot.budget.usedRequests).toBe(39);
  } finally {
    await h.close();
  }
});

test('reset failure before the first intent retains the actual admitted trial identity', async () => {
  const h = await exportHarness();
  try {
    const g = generateManifest(h.input),
      admit = h.s.admitTrial.bind(h.s);
    let trialId: string | undefined;
    vi.spyOn(h.s, 'admitTrial').mockImplementation((journey, phase) => {
      trialId = admit(journey, phase);
      return trialId;
    });
    vi.spyOn(h.s, 'dispatchIntent').mockRejectedValue(
      new Error('EXECUTION ERROR'),
    );
    const r = await verifyArtifact(h.s, h.run, g);
    expect(trialId).toBeDefined();
    expect(r.artifact.verification).toBe('UNVERIFIED');
    expect(r.reason).toBe('BASELINE ERROR');
    const rows = await h.client.query(
      "SELECT trial_id,evaluation FROM evidence WHERE run_id=$1 AND kind='ARTIFACT VERIFICATION'",
      [h.run.id],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].trial_id).toBe(trialId);
    expect(rows.rows[0].evaluation.trialId).toBe(trialId);
    expect(rows.rows[0].evaluation).not.toHaveProperty('evidence');
    expect(h.s.snapshot.budget.usedRequests).toBe(34);
  } finally {
    await h.close();
  }
});
