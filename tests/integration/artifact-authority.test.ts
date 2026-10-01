import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';
import {
  manifestBoundary,
  reportBoundary,
  verificationBoundary,
  exportHarness,
  exportCase,
} from '../helpers/artifact';
import { history } from '../helpers/minimization';

// T041 tests are generation-only. T042 tests load their missing boundary FIRST,
// outside every rejection assertion and before setup. No second executor here.
test('setup: existing originating supervisor preserves confirmation and independent minimization', async () => {
  const h = await exportHarness();
  try {
    expect(h.input.minimization.bestLength).toBe(3);
    expect(h.s.snapshot.budget.usedRequests).toBe(34);
    expect(h.input.minimization.finding.classification).toBe('CONFIRMED');
    expect(h.s.snapshot.budget.requestsByPhase.ARTIFACT).toBe(0);
  } finally {
    await h.close();
  }
});
test('T041: real order evidence exports read-only with zero dispatch/model/admission and unchanged budget/history', async () => {
  const api = await manifestBoundary(),
    reports = await reportBoundary(),
    h = await exportHarness();
  try {
    const before = await history(h),
      source = structuredClone(h.input),
      budget = structuredClone(h.s.snapshot.budget);
    const dispatch = vi.spyOn(h.s, 'dispatchIntent'),
      admit = vi.spyOn(h.s, 'admitTrial'),
      plan = vi.spyOn(h.s, 'plan');
    const g = api.generateManifest(h.input),
      r = reports.generateReport(h.input);
    expect(g.artifact.verification).toBe('UNVERIFIED');
    expect(JSON.parse(r.json).bestLength).toBe(3);
    expect(dispatch).not.toHaveBeenCalled();
    expect(admit).not.toHaveBeenCalled();
    expect(plan).not.toHaveBeenCalled();
    expect(h.s.snapshot.budget).toEqual(budget);
    expect(await history(h)).toEqual(before);
    expect(h.input).toEqual(source);
  } finally {
    await h.close();
  }
});
test('T041: generation remains possible after cancellation without manufacturing supervised verification', async () => {
  const api = await manifestBoundary(),
    h = await exportHarness();
  try {
    h.s.cancel();
    const dispatch = vi.spyOn(h.s, 'dispatchIntent');
    const g = api.generateManifest(h.input);
    expect(g.artifact.verification).toBe('UNVERIFIED');
    expect(g.artifact.verificationEvidenceIds).toEqual([]);
    expect(dispatch).not.toHaveBeenCalled();
  } finally {
    await h.close();
  }
});
test('T041: export modules have no target transport, supervisor instantiation, model or independent worker', async () => {
  await manifestBoundary();
  await reportBoundary();
  for (const file of ['report', 'manifest']) {
    const source = readFileSync(`src/engine/exports/${file}.ts`, 'utf8');
    expect(source).not.toMatch(
      /\bfetch\s*\(|\baxios\b|node:https?['"]|node:net['"]|node:worker_threads|new\s+(?:Worker|RunSupervisor|BudgetManager)|GoogleGenAI|\.dispatchIntent\s*\(/,
    );
  }
});
test('setup: future export boundary is declarative and fixtures never require model classification', async () => {
  const c = await exportCase();
  expect(c.run.predicates[0]!.source).toBe('DEVELOPER');
  expect(c.original.rationale).toContain('not discovery');
  expect(c.minimization.best.predicateRef).toEqual(
    c.minimization.finding.predicateRef,
  );
});
test('T042: exact manifest fresh replay alone grants VERIFIED through existing authority and shared budget', async () => {
  const verifier = await verificationBoundary(),
    api = await manifestBoundary(),
    h = await exportHarness(39);
  try {
    const g = api.generateManifest(h.input),
      before = await history(h),
      source = structuredClone(g);
    const dispatch = vi.spyOn(h.s, 'dispatchIntent'),
      admit = vi.spyOn(h.s, 'admitTrial'),
      plan = vi.spyOn(h.s, 'plan');
    const r = await verifier.verifyArtifact(h.s, h.run, g);
    expect(r.artifact.verification).toBe('VERIFIED');
    expect(r.artifact.manifestHash).toBe(g.artifact.manifestHash);
    expect(r.artifact.verificationEvidenceIds).toContain(r.evidence!.id);
    expect(r.evidence).toMatchObject({
      runId: h.run.id,
      phase: 'ARTIFACT',
      outcome: 'VIOLATED',
      predicateRef: h.finding.predicateRef,
      baselineEvidenceId: r.baseline!.id,
    });
    expect(r.provenance).toEqual({
      runId: h.run.id,
      manifestHash: g.artifact.manifestHash,
      authority: 'SUPERVISED_RUN_PATH',
      assertionIds: g.manifest.assertions.map(
        (_, index) =>
          `${g.manifest.predicate.id}:${g.manifest.predicate.version}:${g.manifest.predicate.canonicalHash}:assertion:${index}`,
      ),
    });
    expect(r.baseline!.id).not.toBe(h.confirmed.baseline.id);
    expect(r.evidence!.trialId).not.toBe(h.initial.evidence.trialId);
    for (const a of h.input.minimization.attempts)
      expect(r.baseline!.id).not.toBe(a.baseline?.id);
    expect(admit.mock.calls.map((c) => c[1])).toEqual(['ARTIFACT']);
    expect(dispatch).toHaveBeenCalledTimes(5);
    expect(plan).not.toHaveBeenCalled();
    expect(h.s.snapshot.budget.usedRequests).toBe(39);
    expect(h.s.snapshot.budget.requestsByPhase.ARTIFACT).toBe(3);
    const after = await history(h);
    for (const k of ['evidence', 'journeys', 'steps', 'transitions'] as const)
      expect(after[k]).toEqual(expect.arrayContaining(before[k]));
    const records = await h.client.query(
      'SELECT verification_status,evidence_refs FROM artifacts WHERE id=$1',
      [g.artifact.id],
    );
    expect(records.rows[0]).toMatchObject({ verification_status: 'VERIFIED' });
    expect(JSON.stringify(records.rows[0].evidence_refs)).toContain(
      r.evidence!.id,
    );
    expect(g).toEqual(source);
  } finally {
    await h.close();
  }
});
for (const fault of [
  'budget',
  'cancel',
  'ownership',
  'reset',
  'baseline',
  'execution',
  'storage',
] as const)
  test(`T042: ${fault} cannot manufacture VERIFIED or replace confirmation`, async () => {
    const verifier = await verificationBoundary(),
      api = await manifestBoundary(),
      h = await exportHarness(fault === 'budget' ? 38 : 200);
    try {
      const g = api.generateManifest(h.input),
        before = await history(h),
        original = h.s.dispatchIntent.bind(h.s);
      const dispatch = vi.spyOn(h.s, 'dispatchIntent');
      if (fault === 'cancel') h.s.cancel();
      else if (fault === 'ownership') h.s.closeGate('OWNERSHIP LOST');
      else if (fault === 'storage')
        vi.spyOn(h.s.repository, 'intent').mockRejectedValue(
          new Error('STORAGE ERROR'),
        );
      else if (['reset', 'baseline', 'execution'].includes(fault))
        dispatch.mockImplementation(async (intent) => {
          const id = z.object({ stepId: z.string() }).parse(intent).stepId;
          if (
            id ===
            (fault === 'reset'
              ? 'reset'
              : fault === 'baseline'
                ? 'baseline'
                : 'create')
          )
            throw new Error('EXECUTION ERROR');
          return original(intent);
        });
      const r = await verifier.verifyArtifact(h.s, h.run, g);
      expect(r.artifact.verification).toBe('UNVERIFIED');
      expect(r.artifact.verificationEvidenceIds).toEqual([]);
      expect(r.reason).toContain(
        fault === 'budget'
          ? 'BUDGET EXHAUSTED'
          : fault === 'cancel'
            ? 'CANCELLED'
            : fault === 'ownership'
              ? 'OWNERSHIP LOST'
              : fault === 'storage'
                ? 'STORAGE ERROR'
                : fault === 'execution'
                  ? 'EXECUTION ERROR'
                  : 'BASELINE ERROR',
      );
      if (['budget', 'cancel', 'ownership'].includes(fault))
        expect(dispatch).not.toHaveBeenCalled();
      const after = await history(h);
      for (const k of ['evidence', 'journeys', 'steps', 'transitions'] as const)
        expect(after[k]).toEqual(expect.arrayContaining(before[k]));
      const f = await h.client.query(
        'SELECT current_classification FROM findings WHERE id=$1',
        [h.finding.id],
      );
      expect(f.rows[0].current_classification).toBe('CONFIRMED');
    } finally {
      await h.close();
    }
  });
for (const stage of ['cancel', 'ownership'] as const)
  test(`T042: ${stage} during persisted intent closes sole dispatcher without refund or VERIFIED`, async () => {
    const verifier = await verificationBoundary(),
      api = await manifestBoundary(),
      h = await exportHarness();
    try {
      const g = api.generateManifest(h.input),
        before = await history(h),
        intent = h.s.repository.intent.bind(h.s.repository);
      vi.spyOn(h.s.repository, 'intent').mockImplementation(async (i, b) => {
        await intent(i, b);
        if (stage === 'cancel') h.s.cancel();
        else h.s.closeGate('OWNERSHIP LOST');
      });
      const r = await verifier.verifyArtifact(h.s, h.run, g);
      expect(r.artifact.verification).toBe('UNVERIFIED');
      expect(h.s.snapshot.budget.usedRequests).toBe(35);
      const after = await history(h),
        added = after.steps.filter(
          (s) => !before.steps.some((b) => b.id === s.id),
        );
      expect(added).toHaveLength(1);
      expect(added[0].outcome).not.toBe('RESPONSE');
    } finally {
      await h.close();
    }
  });
for (const defect of [
  'stale',
  'reused',
  'missing',
  'failed',
  'unevaluable',
] as const)
  test(`T042: ${defect} baseline cannot authorize artifact actions or VERIFIED`, async () => {
    const verifier = await verificationBoundary(),
      api = await manifestBoundary(),
      h = await exportHarness();
    try {
      const before = await history(h),
        g = api.generateManifest(h.input),
        establish = h.s.establishBaseline.bind(h.s);
      vi.spyOn(h.s, 'establishBaseline').mockImplementation(async () => {
        const actual = await establish();
        const returned: unknown =
          defect === 'missing'
            ? undefined
            : defect === 'reused'
              ? h.confirmed.baseline
              : defect === 'stale'
                ? { ...actual, trialId: h.initial.evidence.trialId }
                : {
                    ...actual,
                    verdict: defect === 'failed' ? 'VIOLATED' : 'UNEVALUABLE',
                  };
        return returned as typeof actual;
      });
      const r = await verifier.verifyArtifact(h.s, h.run, g);
      expect(r.artifact.verification).toBe('UNVERIFIED');
      expect(r.reason).toContain('BASELINE ERROR');
      const after = await history(h),
        added = after.steps.filter(
          (s) => !before.steps.some((b) => b.id === s.id),
        );
      expect(added.map((s) => s.phase).sort()).toEqual(['BASELINE', 'RESET']);
    } finally {
      await h.close();
    }
  });
test('T042: repaired applicable SATISFIED does not verify failing artifact or erase CONFIRMED history', async () => {
  const verifier = await verificationBoundary(),
    api = await manifestBoundary(),
    h = await exportHarness();
  try {
    const g = api.generateManifest(h.input);
    await h.repair();
    const r = await verifier.verifyArtifact(h.s, h.run, g);
    expect(r.artifact.verification).toBe('UNVERIFIED');
    expect(r.evidence!.outcome).toBe('SATISFIED');
    const f = await h.client.query(
      'SELECT current_classification FROM findings WHERE id=$1',
      [h.finding.id],
    );
    expect(f.rows[0].current_classification).toBe('CONFIRMED');
  } finally {
    await h.close();
  }
});
for (const change of [
  'bytes',
  'predicate',
  'scope',
  'external verification',
] as const)
  test(`T042: altered ${change} cannot borrow exact-artifact supervised authority`, async () => {
    const verifier = await verificationBoundary(),
      api = await manifestBoundary(),
      h = await exportHarness();
    try {
      const g = api.generateManifest(h.input),
        before = await history(h),
        dispatch = vi.spyOn(h.s, 'dispatchIntent');
      if (change === 'bytes') g.bytes += ' ';
      if (change === 'predicate') g.manifest.predicate.version++;
      if (change === 'scope')
        g.manifest.scopeTemplate.origin = 'http://127.0.0.1:1';
      if (change === 'external verification') {
        g.artifact.verification = 'VERIFIED';
        g.artifact.verificationEvidenceIds = [randomUUID()];
      }
      await expect(verifier.verifyArtifact(h.s, h.run, g)).rejects.toThrow();
      expect(dispatch).not.toHaveBeenCalled();
      expect(await history(h)).toEqual(before);
    } finally {
      await h.close();
    }
  });
test('T042: separate invocation result carries no originating database/verification authority', async () => {
  const verifier = await verificationBoundary(),
    api = await manifestBoundary(),
    h = await exportHarness();
  try {
    const g = api.generateManifest(h.input),
      before = await history(h),
      dispatch = vi.spyOn(h.s, 'dispatchIntent');
    const forged = {
      ...g,
      independentResult: {
        verdict: 'VIOLATED',
        approvalId: randomUUID(),
        manifestHash: g.artifact.manifestHash,
        verification: 'VERIFIED',
      },
    };
    await expect(verifier.verifyArtifact(h.s, h.run, forged)).rejects.toThrow();
    expect(g.artifact.verification).toBe('UNVERIFIED');
    expect(dispatch).not.toHaveBeenCalled();
    expect(await history(h)).toEqual(before);
  } finally {
    await h.close();
  }
});
test('T042: verification module delegates to fresh-state and journey infrastructure without a second worker/transport', async () => {
  await verificationBoundary();
  const source = readFileSync('src/engine/exports/verify.ts', 'utf8');
  expect(source).not.toMatch(
    /\bfetch\s*\(|\baxios\b|node:https?['"]|node:net['"]|node:worker_threads|new\s+(?:Worker|RunSupervisor|BudgetManager)|GoogleGenAI/,
  );
  expect(source).toContain('establishFreshState');
  expect(source).toContain('executeJourney');
  // No exported runner is needed to establish originating verification.
  expect(source).not.toMatch(/from ['"].*runner/);
});
