import { expect, test, vi } from 'vitest';
import { minimizeFinding } from '../../src/engine/minimization/greedy';
import {
  finishMinimization,
  recordMinimizationAttempt,
} from '../../src/server/repositories/minimization';
import { SecretVault } from '../../src/engine/secrets/vault';
import { history, minimizationHarness } from '../helpers/minimization';

test('later invocation retains durable minimized best, even after supervisor cancellation', async () => {
  const h = await minimizationHarness();
  try {
    const first = await minimizeFinding(h.s, h.run, h.journey, h.finding);
    const before = await history(h),
      dispatch = vi.spyOn(h.s, 'dispatchIntent');
    const next = await minimizeFinding(h.s, h.run, h.journey, first.finding);
    expect(next.best).toEqual(first.best);
    expect(next.stopReason).toBe('LOCAL MINIMUM');
    expect(dispatch).not.toHaveBeenCalled();
    await h.s.stop('CANCELLED');
    const stopped = await minimizeFinding(h.s, h.run, h.journey, next.finding);
    expect(stopped.best).toEqual(first.best);
    expect(stopped.stopReason).toBe('CANCELLED');
    expect(stopped.locallyIrreducible).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    const after = await history(h);
    expect(after.evidence).toEqual(expect.arrayContaining(before.evidence));
  } finally {
    await h.close();
  }
});
test('repository rejects stale larger best and repeated accepted decision without changing durable history', async () => {
  const h = await minimizationHarness();
  try {
    const result = await minimizeFinding(h.s, h.run, h.journey, h.finding);
    const before = await history(h),
      vault = new SecretVault();
    await expect(
      finishMinimization(
        h.client,
        result.finding,
        h.journey,
        'LOCAL MINIMUM',
        true,
        vault,
      ),
    ).rejects.toThrow('STALE MINIMIZATION BEST');
    const stale = result.attempts.find((a) => a.accepted)!;
    await expect(
      recordMinimizationAttempt(
        h.client,
        h.run,
        result.finding,
        h.journey,
        stale,
        stale.candidate,
        vault,
      ),
    ).rejects.toThrow();
    expect(await history(h)).toEqual(before);
    await expect(
      h.client.query('UPDATE evidence SET evaluation=$1 WHERE kind=$2', [
        {},
        'MINIMIZATION ATTEMPT',
      ]),
    ).rejects.toThrow();
    await expect(
      h.client.query('DELETE FROM evidence WHERE kind=$1', [
        'MINIMIZATION RESULT',
      ]),
    ).rejects.toThrow();
    vault.discard();
  } finally {
    await h.close();
  }
});
test('failed reset before dispatch retains the actually admitted trial identity, without a predicate verdict', async () => {
  const h = await minimizationHarness();
  try {
    const admission = vi.spyOn(h.s, 'admitTrial');
    vi.spyOn(h.s, 'dispatchIntent').mockRejectedValue(
      new Error('EXECUTION ERROR'),
    );
    const result = await minimizeFinding(h.s, h.run, h.journey, h.finding);
    const failed = result.attempts.find(
      (a) => a.executionOutcome === 'BASELINE ERROR',
    )!;
    expect(failed.trialId).toBe(admission.mock.results[0]!.value);
    expect(failed.evidence).toBeUndefined();
    expect(failed.accepted).toBe(false);
    const rows = await h.client.query(
      "SELECT trial_id,evaluation FROM evidence WHERE kind=$1 AND evaluation->'attempt'->>'executionOutcome'=$2",
      ['MINIMIZATION ATTEMPT', 'BASELINE ERROR'],
    );
    expect(rows.rows[0].trial_id).toBe(failed.trialId);
    expect(rows.rows[0].evaluation.attempt).toEqual(failed);
  } finally {
    await h.close();
  }
});

test('active supervisor run must match the source confirmation before reset admission', async () => {
  const h = await minimizationHarness();
  try {
    const active = h.s.snapshot;
    vi.spyOn(h.s, 'snapshot', 'get').mockReturnValue({
      ...active,
      id: h.finding.id,
    });
    const admission = vi.spyOn(h.s, 'admitTrial'),
      dispatch = vi.spyOn(h.s, 'dispatchIntent');
    const result = await minimizeFinding(h.s, h.run, h.journey, h.finding);
    expect(result.stopReason).toBe('EXECUTION ERROR');
    expect(result.best).toEqual(h.journey);
    expect(admission).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  } finally {
    await h.close();
  }
});
