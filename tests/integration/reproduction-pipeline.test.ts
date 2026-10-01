import { expect, test } from 'vitest';
import { resolve } from 'node:path';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import { orderConfiguration } from '../../scripts/t035-configuration';
import { runVerticalSlice } from '../../src/cli/vertical-slice';
import { migrate } from '../../src/server/migrate';
import { isolatedDatabase } from '../helpers/database';
import { orderJourney } from '../helpers/verification';
import { redundantJourney } from '../helpers/minimization';
import { canonical } from '../../src/engine/detection/predicate';
async function scenario(
  minimal: boolean,
  requests = 200,
  repaired = false,
  wrongIdentity = false,
) {
  const target = await startOrderFixture(repaired),
    db = await isolatedDatabase();
  try {
    await migrate(db.client, resolve('migrations'));
    const { run } = await orderConfiguration(
      target.openapi,
      target.url,
      'integration-model',
    );
    run.modelConfiguration = {
      provider: 'integration',
      model: 'integration-model',
    };
    run.budget.limits.requests = requests;
    await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      run.projectId,
      'T044 automated composition; not live acceptance',
    ]);
    await db.client.query(
      "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'SCOPE',$3,$4)",
      [
        run.scope.approvalId,
        run.projectId,
        run.apiSnapshot.contentHash,
        run.scope,
      ],
    );
    const original = minimal
      ? orderJourney(run)
      : redundantJourney(orderJourney(run));
    if (wrongIdentity) original.predicateRef.hash = '0'.repeat(64);
    const before = structuredClone(run);
    const provider = {
      identity: { provider: 'integration', model: 'integration-model' },
      propose: async () => ({
        proposal: original,
        provider: 'integration',
        model: 'integration-model',
        usage: { inputTokens: 1, outputTokens: 1, estimated: false },
      }),
    };
    const progress: { stage: string; completed: boolean }[] = [];
    const result = await runVerticalSlice(
      db.client,
      run,
      provider,
      {},
      undefined,
      false,
      true,
      (stage, completed) => progress.push({ stage, completed }),
    );
    expect(run).toEqual(before);
    return {
      result,
      progress,
      run,
      steps: (
        await db.client.query(
          'SELECT * FROM step_records ORDER BY request_intent_at,id',
        )
      ).rows,
    };
  } finally {
    await db.close();
    await target.close();
  }
}
for (const minimal of [false, true])
  test(`production vertical slice composes independent replay, ${minimal ? 'already minimal' : 'actual reduction'}, exports and supervised verification`, async () => {
    const { result, run, steps, progress } = await scenario(minimal);
    expect(progress.filter((p) => p.completed).map((p) => p.stage)).toEqual([
      'RUN_ADMISSION',
      'DISCOVERY',
      'CONFIRMATION',
      'MINIMIZATION',
      'EVIDENCE_LOADING',
      'REPORT_GENERATION',
      'MANIFEST_GENERATION',
      'SUPERVISED_VERIFICATION',
      'PREDICATE_IDENTITY',
      'BUNDLE_GENERATION',
      'BUNDLE_ISOLATION',
      'RUN_COMPLETION',
    ]);
    expect(result.candidate?.classification).toBe('OBSERVED VIOLATION');
    expect('reproduction' in result).toBe(true);
    if (!('reproduction' in result) || !result.reproduction)
      throw new Error('REPRODUCTION REQUIRED');
    const r = result.reproduction;
    expect(result.verification.finding.classification).toBe('CONFIRMED');
    expect(r.minimization.originalLength).toBe(minimal ? 3 : 6);
    expect(r.minimization.bestLength).toBe(3);
    expect(r.supervised.artifact.verification).toBe('VERIFIED');
    const ref = result.candidate!.predicateRef;
    for (const actual of [
      r.initial.evidence.predicateRef,
      r.replays[0]!.evidence.predicateRef,
      r.minimization.best.predicateRef,
      r.generated.manifest.predicateRef,
      r.supervised.evidence!.predicateRef,
      JSON.parse(r.reports.json).predicateRef,
    ])
      expect(actual).toEqual(ref);
    expect(r.generated.manifest.provenance.runId).toBe(run.id);
    expect(r.generated.manifest.journey).toEqual(r.minimization.best);
    expect(r.reports.markdown).toContain(r.initial.evidence.id);
    expect(r.reports.markdown).toContain(r.replays[0]!.baseline.id);
    expect(r.initial.baseline.id).not.toBe(r.replays[0]!.baseline.id);
    expect(r.supervised.baseline!.id).not.toBe(r.initial.baseline.id);
    expect(r.supervised.provenance?.authority).toBe('SUPERVISED_RUN_PATH');
    expect(r.bundle.manifestHash).toBe(r.generated.artifact.manifestHash);
    expect(r.bundle.inputs.join('\n')).not.toMatch(
      /http-executor|src\/server\/|planning\/|node_modules\/(?:pg|@google)\//,
    );
    expect(r.finalBudget.usedRequests).toBe(minimal ? 15 : 39);
    expect(r.finalBudget.usedRequests).toBe(steps.length);
    expect(r.budgetSnapshots.map((s) => s.stage)).toEqual([
      'ACCEPTED',
      'DISCOVERY',
      'CONFIRMED',
      'MINIMIZED',
      'ARTIFACT',
    ]);
    let used = 0;
    for (const s of r.budgetSnapshots) {
      expect(s.budget.acceptedAt).toBe(r.finalBudget.acceptedAt);
      expect(s.budget.deadlineAt).toBe(r.finalBudget.deadlineAt);
      expect(s.budget.limits).toEqual(r.finalBudget.limits);
      expect(s.budget.usedRequests).toBeGreaterThanOrEqual(used);
      used = s.budget.usedRequests;
    }
    const trials = new Set([
      r.initial.evidence.trialId,
      r.replays[0]!.evidence.trialId,
      r.supervised.evidence!.trialId,
    ]);
    expect(trials.size).toBe(3);
    const bodies = steps.filter(
      (s) => s.sanitized_request?.operationId === 'POST /api/orders',
    );
    expect(bodies.length).toBeGreaterThanOrEqual(3);
    const freshIds = bodies.map((s) => s.sanitized_response?.body?.id);
    expect(freshIds.every((id) => typeof id === 'string')).toBe(true);
    expect(new Set(freshIds).size).toBe(freshIds.length);
    expect(canonical(r.generated.manifest.predicateRef)).toBe(canonical(ref));
  });
test('non-violating discovery cannot enter minimization/export/verification', async () => {
  const { result } = await scenario(true, 200, true);
  expect(result.candidate).toBeUndefined();
  expect(result).not.toHaveProperty('reproduction');
});
test('remaining originating budget refuses artifact trial without manufacturing VERIFIED', async () => {
  const { result } = await scenario(false, 38);
  if (!('reproduction' in result) || !result.reproduction)
    throw new Error('REPRODUCTION REQUIRED');
  expect(result.reproduction.supervised.artifact.verification).toBe(
    'UNVERIFIED',
  );
  expect(result.reproduction.supervised.reason).toBe('BUDGET EXHAUSTED');
  expect(result.reproduction.finalBudget.usedRequests).toBe(34);
});
test('wrong proposed exact predicate identity stops before discovery target requests', async () => {
  const { result, steps } = await scenario(true, 200, false, true);
  expect(result.stopReason).toBe('MODEL PLAN ERROR');
  expect(result).not.toHaveProperty('reproduction');
  expect(steps).toHaveLength(0);
});

test('unconfirmed discovery cannot enter minimization when replay admission fails', async () => {
  await expect(scenario(true, 5)).rejects.toThrow('BUDGET EXHAUSTED');
});
