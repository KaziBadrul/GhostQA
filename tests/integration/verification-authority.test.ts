import { expect, test, vi } from 'vitest';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { requestProposal } from '../../src/engine/planning/provider';
import { buildPlanningContext } from '../../src/engine/planning/context';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import { orderConfiguration } from '../../scripts/t035-configuration';
import { migrate } from '../../src/server/migrate';
import { runVerticalSlice } from '../../src/cli/vertical-slice';
import { replayCandidate } from '../../src/engine/verification/replay';
import { recordVerification } from '../../src/server/repositories/findings';
import {
  savePredicate,
  approvePredicate,
  loadPredicateApproval,
} from '../../src/server/repositories/predicates';
import { SecretVault } from '../../src/engine/secrets/vault';
import { isolatedDatabase } from '../helpers/database';
import {
  orderCase,
  orderHarness,
  orderJourney,
  type VerificationInput,
} from '../helpers/verification';

test('CLI hands live discovery authority to fresh replay before closing the gate', async () => {
  const fixture = await startOrderFixture(false);
  const db = await isolatedDatabase();
  try {
    await migrate(db.client, resolve('migrations'));
    const { run } = await orderConfiguration(
      fixture.openapi,
      fixture.url,
      'test-model',
    );
    await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      run.projectId,
      'T037 CLI',
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
    const journey = orderJourney(run);
    const propose = vi.fn(async () => ({
      proposal: journey,
      provider: 'test-provider',
      model: 'test-model',
      usage: { estimated: true },
    }));
    run.modelConfiguration = { provider: 'test-provider', model: 'test-model' };
    const result = await runVerticalSlice(
      db.client,
      run,
      { identity: { provider: 'test-provider', model: 'test-model' }, propose },
      {},
      undefined,
      true,
    );
    expect(result.stopReason).toBe('DISCOVERY COMPLETE');
    expect(propose).toHaveBeenCalledTimes(1);
    expect(
      'verification' in result && result.verification.finding.classification,
    ).toBe('CONFIRMED');
    const persisted = await db.client.query(
      'SELECT status,stop_reason,counters FROM runs WHERE id=$1',
      [run.id],
    );
    expect(persisted.rows[0]).toMatchObject({
      status: 'STOPPED',
      stop_reason: 'DISCOVERY COMPLETE',
      counters: {
        usedRequests: 10,
        modelCalls: 1,
        requestsByPhase: { RESET: 2, BASELINE: 2, EXPLORATION: 3, REPLAY: 3 },
      },
    });
  } finally {
    await db.close();
    await fixture.close();
  }
});
test('edited journey with the same predicate cannot cause reset or target dispatch', async () => {
  const h = await orderHarness();
  try {
    const initial = await h.trial('EXPLORATION');
    const edited = structuredClone(h.journey);
    edited.steps.reverse();
    const dispatch = vi.spyOn(h.s, 'dispatchIntent');
    await expect(
      replayCandidate(h.s, h.run, edited, initial.finding!),
    ).rejects.toThrow('VERIFICATION IDENTITY MISMATCH');
    expect(dispatch).not.toHaveBeenCalled();
  } finally {
    await h.close();
  }
});
test('stale repository updates cannot overwrite a completed verification or append duplicate history', async () => {
  const h = await orderHarness();
  try {
    const initial = await h.trial('EXPLORATION');
    const replay = await h.trial('REPLAY');
    const input: VerificationInput = {
      run: h.run,
      finding: initial.finding!,
      predicate: h.run.predicates[0]!,
      initial,
      replay,
      initialApprovals: new Set(),
      replayApprovals: new Set(),
      specificationAssertions: new Map(),
    };
    const vault = new SecretVault();
    await recordVerification(h.client, input, vault);
    await expect(recordVerification(h.client, input, vault)).rejects.toThrow(
      'STALE FINDING',
    );
    expect(
      (
        await h.client.query(
          'SELECT count(*)::int AS count FROM finding_transitions',
        )
      ).rows[0].count,
    ).toBe(2);
    expect(
      (await h.client.query('SELECT current_classification FROM findings'))
        .rows[0].current_classification,
    ).toBe('CONFIRMED');
  } finally {
    await h.close();
  }
});
test('direct historical deletion and consistency restoration are blocked; explicit project deletion still cascades', async () => {
  const h = await orderHarness();
  try {
    const initial = await h.trial('EXPLORATION');
    await expect(
      h.client.query('DELETE FROM findings WHERE id=$1', [initial.finding!.id]),
    ).rejects.toThrow('Immutable record');
    await expect(
      h.client.query('DELETE FROM evidence WHERE id=$1', [initial.evidence.id]),
    ).rejects.toThrow('Immutable record');
    await h.client.query('UPDATE findings SET consistent=false WHERE id=$1', [
      initial.finding!.id,
    ]);
    await expect(
      h.client.query('UPDATE findings SET consistent=true WHERE id=$1', [
        initial.finding!.id,
      ]),
    ).rejects.toThrow('New initial finding required');
    await h.client.query('DELETE FROM projects WHERE id=$1', [h.run.projectId]);
    expect(
      (await h.client.query('SELECT count(*)::int AS count FROM evidence'))
        .rows[0].count,
    ).toBe(0);
    expect(
      (
        await h.client.query(
          'SELECT count(*)::int AS count FROM finding_transitions',
        )
      ).rows[0].count,
    ).toBe(0);
  } finally {
    await h.close();
  }
});
test('approval added after run acceptance cannot retroactively supply initial eligibility', async () => {
  const h = await orderHarness();
  try {
    const p = h.run.predicates[0]!;
    const ref = { id: p.id, version: p.version, hash: p.canonicalHash };
    await savePredicate(h.client, h.run.projectId, p, new SecretVault());
    const approval = await approvePredicate(h.client, h.run.projectId, ref);
    expect(
      (await loadPredicateApproval(h.client, h.run.projectId, ref, approval))
        .size,
    ).toBe(1);
    expect(
      (
        await loadPredicateApproval(
          h.client,
          h.run.projectId,
          ref,
          approval,
          h.run.budget.acceptedAt,
        )
      ).size,
    ).toBe(0);
  } finally {
    await h.close();
  }
});

test('invented hypothesis hashes remain rejected with sanitized diagnostics; supplied eligible predicate is preserved', async () => {
  const c = await orderCase();
  const context = buildPlanningContext(
    {
      run: c.run,
      mappings: [],
      observations: [],
      symbolicInputs: {},
      consideredHypothesisHashes: [],
    },
    new SecretVault(),
  );
  const hypothesis = {
    ...c.run.predicates[0]!,
    id: randomUUID(),
    source: 'AGENT_HYPOTHESIS' as const,
    canonicalHash: '0'.repeat(64),
  };
  let proposal = { journey: c.journey, mappings: [], hypotheses: [hypothesis] };
  const input = {
    provider: {
      identity: { provider: 'test-provider', model: 'test-model' },
      async propose() {
        return {
          provider: 'test-provider',
          model: 'test-model',
          proposal,
          usage: { estimated: true },
        };
      },
    },
    context,
    api: c.run.apiSnapshot,
    scope: c.run.scope,
    model: 'test-model',
    signal: new AbortController().signal,
    timeoutMs: 30000,
    remainingMilliseconds: 600000,
  };
  await expect(requestProposal(input)).rejects.toMatchObject({
    message: 'MODEL PLAN ERROR',
    telemetry: {
      diagnostic: {
        stage: 'CONTRACT_VALIDATION',
        model: 'test-model',
        contractIssues: [
          { code: 'custom', path: ['hypotheses', 'canonicalHash'] },
        ],
      },
    },
  });
  expect(hypothesis.canonicalHash).toBe('0'.repeat(64));
  proposal = { ...proposal, hypotheses: [] };
  const accepted = await requestProposal(input);
  expect(accepted.proposal).toEqual(proposal);
  expect(c.journey.predicateRef.hash).toBe(c.run.predicates[0]!.canonicalHash);
});
