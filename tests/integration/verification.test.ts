import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { FindingSchema } from '../../src/engine/contracts';
import { SecretVault } from '../../src/engine/secrets/vault';
import {
  orderHarness,
  replayBoundary,
  repositoryBoundary,
  type VerificationInput,
} from '../helpers/verification';

async function history(h: Awaited<ReturnType<typeof orderHarness>>) {
  const findings = await h.client.query('SELECT * FROM findings ORDER BY id');
  const transitions = await h.client.query(
    'SELECT * FROM finding_transitions ORDER BY id',
  );
  const evidence = await h.client.query('SELECT * FROM evidence ORDER BY id');
  return {
    findings: findings.rows,
    transitions: transitions.rows,
    evidence: evidence.rows,
  };
}
test('T036 harness discovers T035 order violation through existing supervisor, durable dispatch and baseline', async () => {
  const h = await orderHarness();
  try {
    const trial = await h.trial('EXPLORATION');
    expect(trial.finding?.classification).toBe('OBSERVED VIOLATION');
    expect(trial.evidence.outcome).toBe('VIOLATED');
    expect(trial.baseline.trialId).toBe(trial.evidence.trialId);
    const phases = await h.client.query(
      'SELECT phase,count(*)::int AS count FROM step_records GROUP BY phase',
    );
    expect(phases.rows).toEqual(
      expect.arrayContaining([
        { phase: 'RESET', count: 1 },
        { phase: 'BASELINE', count: 1 },
        { phase: 'EXPLORATION', count: 3 },
      ]),
    );
  } finally {
    await h.close();
  }
});
for (const repaired of [false, true])
  test(`independent supervised order replay repaired=${repaired}`, async () => {
    const api = await replayBoundary();
    const h = await orderHarness();
    try {
      const initial = await h.trial('EXPLORATION');
      const before = await history(h);
      if (repaired) await h.repair(); // Evaluator changes variant; engine contract/scope stays frozen.
      const dispatch = vi.spyOn(h.s, 'dispatchIntent');
      const next = await api.replayCandidate(
        h.s,
        h.run,
        h.journey,
        initial.finding!,
      );
      expect(next.finding.classification).toBe(
        repaired ? 'NON-REPRODUCED' : 'CONFIRMED',
      );
      expect(next.evidence.outcome).toBe(repaired ? 'SATISFIED' : 'VIOLATED');
      expect(next.evidence.predicateRef).toEqual(initial.evidence.predicateRef);
      expect(next.evidence.id).not.toBe(initial.evidence.id);
      expect(next.baseline.id).not.toBe(initial.baseline.id);
      expect(next.baseline.trialId).not.toBe(initial.baseline.trialId);
      expect(next.evidence.baselineEvidenceId).toBe(next.baseline.id);
      expect(next.evidence.trialId).toBe(next.baseline.trialId);
      expect(dispatch).toHaveBeenCalledTimes(5);
      const after = await history(h);
      expect(after.transitions).toHaveLength(before.transitions.length + 1);
      expect(after.evidence).toEqual(expect.arrayContaining(before.evidence));
      expect(after.transitions).toEqual(
        expect.arrayContaining(before.transitions),
      );
      expect(after.findings[0].current_classification).toBe(
        next.finding.classification,
      );
      const counters = await h.client.query(
        'SELECT counters FROM runs WHERE id=$1',
        [h.run.id],
      );
      expect(counters.rows[0].counters.usedRequests).toBe(10);
      expect(counters.rows[0].counters.requestsByPhase).toMatchObject({
        RESET: 2,
        BASELINE: 2,
        EXPLORATION: 3,
        REPLAY: 3,
      });
      expect(counters.rows[0].counters.modelCalls).toBe(0);
    } finally {
      await h.close();
    }
  });
for (const failure of [
  'budget',
  'reset',
  'baseline',
  'cancel',
  'execution',
] as const)
  test(`${failure} failure preserves honest stop outcome, no manufactured finding`, async () => {
    const api = await replayBoundary();
    // Discovery costs five requests; a new complete trial costs another five.
    const h = await orderHarness(false, failure === 'budget' ? 9 : 200);
    try {
      const initial = await h.trial('EXPLORATION');
      const before = await history(h);
      const original = h.s.dispatchIntent.bind(h.s);
      const dispatch = vi.spyOn(h.s, 'dispatchIntent');
      if (failure === 'cancel') h.s.cancel();
      if (
        failure === 'reset' ||
        failure === 'baseline' ||
        failure === 'execution'
      ) {
        dispatch.mockImplementation(async (intent) => {
          const operation =
            failure === 'reset'
              ? 'POST /api/control/reset'
              : failure === 'baseline'
                ? 'GET /api/control/baseline'
                : 'POST /api/orders';
          if (
            z
              .object({
                kind: z.literal('EXECUTE'),
                operationId: z.literal(operation),
              })
              .safeParse(intent).success
          )
            throw new Error('EXECUTION ERROR');
          return original(intent);
        });
      }
      await expect(
        api.replayCandidate(h.s, h.run, h.journey, initial.finding!),
      ).rejects.toThrow(
        failure === 'budget'
          ? 'BUDGET EXHAUSTED'
          : failure === 'cancel'
            ? 'CANCELLED'
            : failure === 'execution'
              ? 'EXECUTION ERROR'
              : 'BASELINE ERROR',
      );
      const after = await history(h);
      // Pending verification becomes INCONCLUSIVE; failure is still a run/trial outcome.
      expect(after.transitions).toEqual(
        expect.arrayContaining(before.transitions),
      );
      expect(after.evidence).toEqual(expect.arrayContaining(before.evidence));
      expect(after.findings[0].current_classification).toBe('INCONCLUSIVE');
      expect(after.transitions).toHaveLength(before.transitions.length + 1);
      expect(
        after.evidence.filter((row) => row.kind === 'PREDICATE'),
      ).toHaveLength(1);
      if (failure === 'budget' || failure === 'cancel')
        expect(dispatch).not.toHaveBeenCalled();
      else
        expect(dispatch).toHaveBeenCalledTimes(
          failure === 'reset' ? 1 : failure === 'baseline' ? 2 : 3,
        );
      const run = await h.client.query(
        'SELECT status,stop_reason FROM runs WHERE id=$1',
        [h.run.id],
      );
      expect(run.rows[0].status).toBe('STOPPED');
      expect(run.rows[0].stop_reason).toBe(
        failure === 'budget'
          ? 'BUDGET EXHAUSTED'
          : failure === 'cancel'
            ? 'CANCELLED'
            : failure === 'execution'
              ? 'EXECUTION ERROR'
              : 'BASELINE ERROR',
      );
    } finally {
      await h.close();
    }
  });
test('caller cannot replay an edited journey or predicate under original finding identity', async () => {
  const api = await replayBoundary();
  const h = await orderHarness();
  try {
    const initial = await h.trial('EXPLORATION');
    const dispatch = vi.spyOn(h.s, 'dispatchIntent');
    const edited = structuredClone(h.journey);
    edited.predicateRef.version++;
    await expect(
      api.replayCandidate(h.s, h.run, edited, initial.finding!),
    ).rejects.toThrow();
    expect(dispatch).not.toHaveBeenCalled();
    expect((await history(h)).findings[0].current_classification).toBe(
      'OBSERVED VIOLATION',
    );
  } finally {
    await h.close();
  }
});
for (const forged of [
  'none',
  'discovery evidence',
  'foreign baseline',
  'unknown observation',
] as const)
  test(`repository exact durable evidence references: ${forged}`, async () => {
    const api = await repositoryBoundary();
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
      const before = await history(h);
      if (forged === 'discovery evidence') input.replay = initial;
      if (forged === 'foreign baseline')
        input.replay.baseline = { ...replay.baseline, id: randomUUID() };
      if (forged === 'unknown observation')
        input.replay.evidence = {
          ...replay.evidence,
          observationIds: [randomUUID()],
        };
      if (forged !== 'none') {
        await expect(
          api.recordVerification(h.client, input, new SecretVault()),
        ).rejects.toThrow();
        expect(await history(h)).toEqual(before);
      } else {
        const next = FindingSchema.parse(
          await api.recordVerification(h.client, input, new SecretVault()),
        );
        expect(next.classification).toBe('CONFIRMED');
        expect(next.replayEvidenceIds).toEqual([replay.evidence.id]);
        const after = await history(h);
        expect(after.transitions).toHaveLength(before.transitions.length + 1);
        expect(after.transitions).toEqual(
          expect.arrayContaining(before.transitions),
        );
        expect(after.evidence).toEqual(before.evidence);
        expect(after.findings[0].current_classification).toBe('CONFIRMED');
        // Evidence and transition history are immutable even to a repository caller.
        await expect(
          h.client.query('UPDATE evidence SET evaluation=$1 WHERE id=$2', [
            {},
            initial.evidence.id,
          ]),
        ).rejects.toThrow();
        await expect(
          h.client.query(
            'DELETE FROM finding_transitions WHERE finding_id=$1',
            [next.id],
          ),
        ).rejects.toThrow();
      }
    } finally {
      await h.close();
    }
  });

// These green controls exercise the real existing lifecycle beneath the future
// replay boundary. They establish that T037 red tests do not hide a broken harness.
for (const repaired of [false, true])
  test(`existing fresh-trial machinery supports independent order replay repaired=${repaired}`, async () => {
    const h = await orderHarness();
    try {
      const initial = await h.trial('EXPLORATION');
      if (repaired) await h.repair();
      const replay = await h.trial('REPLAY');
      expect(initial.evidence.outcome).toBe('VIOLATED');
      expect(replay.evidence.outcome).toBe(repaired ? 'SATISFIED' : 'VIOLATED');
      expect(replay.evidence.predicateRef).toEqual(
        initial.evidence.predicateRef,
      );
      expect(replay.baseline.id).not.toBe(initial.baseline.id);
      expect(replay.baseline.trialId).not.toBe(initial.baseline.trialId);
      expect((await history(h)).findings[0].current_classification).toBe(
        'OBSERVED VIOLATION',
      );
    } finally {
      await h.close();
    }
  });

test('repository appends later inconsistent replay and preserves prior confirmation evidence', async () => {
  const api = await repositoryBoundary();
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
    input.finding = await api.recordVerification(
      h.client,
      input,
      new SecretVault(),
    );
    expect(input.finding.classification).toBe('CONFIRMED');
    const confirmedHistory = await history(h);
    await h.repair();
    input.replay = await h.trial('REPLAY');
    const next = await api.recordVerification(
      h.client,
      input,
      new SecretVault(),
    );
    expect(next.consistent).toBe(false);
    expect(next.replayEvidenceIds).toEqual([
      replay.evidence.id,
      (input.replay.evidence as typeof replay.evidence).id,
    ]);
    const after = await history(h);
    expect(after.findings[0].consistent).toBe(false);
    expect(after.transitions).toHaveLength(
      confirmedHistory.transitions.length + 1,
    );
    expect(after.transitions).toEqual(
      expect.arrayContaining(confirmedHistory.transitions),
    );
    expect(after.evidence).toEqual(
      expect.arrayContaining(confirmedHistory.evidence),
    );
  } finally {
    await h.close();
  }
});

test('unrelated execution failure after confirmation preserves historical confirmed finding', async () => {
  const api = await replayBoundary();
  const h = await orderHarness();
  try {
    const initial = await h.trial('EXPLORATION');
    const confirmed = await api.replayCandidate(
      h.s,
      h.run,
      h.journey,
      initial.finding!,
    );
    const before = await history(h);
    const original = h.s.dispatchIntent.bind(h.s);
    vi.spyOn(h.s, 'dispatchIntent').mockImplementation(async (intent) => {
      if (
        z
          .object({
            kind: z.literal('EXECUTE'),
            operationId: z.literal('POST /api/orders'),
          })
          .safeParse(intent).success
      )
        throw new Error('EXECUTION ERROR');
      return original(intent);
    });
    await expect(
      api.replayCandidate(h.s, h.run, h.journey, confirmed.finding),
    ).rejects.toThrow('EXECUTION ERROR');
    const after = await history(h);
    expect(after.findings[0].current_classification).toBe('CONFIRMED');
    expect(after.findings[0].consistent).toBe(true);
    expect(after.transitions).toEqual(
      expect.arrayContaining(before.transitions),
    );
    expect(after.evidence).toEqual(expect.arrayContaining(before.evidence));
  } finally {
    await h.close();
  }
});
