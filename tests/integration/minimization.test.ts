import { randomUUID } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';
import { FindingSchema, JourneySchema } from '../../src/engine/contracts';
import { establishFreshState } from '../../src/engine/fresh-state/manager';
import { executeJourney } from '../../src/engine/execution/journey';
import {
  evaluatePredicate,
  canonical,
} from '../../src/engine/detection/predicate';
import {
  minimizerBoundary,
  minimizationHarness,
  MinimizationResultSchema,
  history,
  ids,
  without,
} from '../helpers/minimization';

const required = ['create', 'cancelled', 'later'];
const removable = ['readBefore', 'readAfter', 'extraOrder'];
type Harness = Awaited<ReturnType<typeof minimizationHarness>>;
function preservedHistory(
  before: Awaited<ReturnType<typeof history>>,
  after: Awaited<ReturnType<typeof history>>,
) {
  for (const key of ['evidence', 'journeys', 'steps', 'transitions'] as const)
    expect(after[key]).toEqual(expect.arrayContaining(before[key]));
}
async function assertFindingRetained(
  h: Harness,
  before: Awaited<ReturnType<typeof history>>,
) {
  const after = await history(h);
  preservedHistory(before, after);
  const stored = await h.client.query(
    'SELECT current_classification,consistent,original_journey_id,predicate_ref FROM findings WHERE id=$1',
    [h.finding.id],
  );
  expect(stored.rows[0]).toMatchObject({
    current_classification: 'CONFIRMED',
    consistent: true,
    original_journey_id: h.journey.id,
    predicate_ref: h.journey.predicateRef,
  });
  return after;
}
for (const minimal of [false, true])
  test(`setup: existing supervisor independently confirms supplied order journey minimal=${minimal}`, async () => {
    const h = await minimizationHarness(200, minimal);
    try {
      expect(h.finding.classification).toBe('CONFIRMED');
      expect(h.finding.predicateRef).toEqual(h.journey.predicateRef);
      expect(h.confirmed.baseline.id).not.toBe(h.initial.baseline.id);
      expect(h.confirmed.evidence.trialId).not.toBe(h.initial.evidence.trialId);
      expect(h.confirmed.evidence.outcome).toBe('VIOLATED');
      expect(h.s.snapshot.budget.usedRequests).toBe(minimal ? 10 : 16);
    } finally {
      await h.close();
    }
  });
test('setup: valid five-step MINIMIZATION trial already uses independent baseline and sole dispatcher', async () => {
  const h = await minimizationHarness();
  try {
    const candidate = without(h.journey, 'readBefore');
    const dispatch = vi.spyOn(h.s, 'dispatchIntent');
    const trial = await establishFreshState(
      h.s,
      h.run,
      candidate,
      'MINIMIZATION',
      {},
    );
    await executeJourney(h.s, h.run, candidate, trial);
    expect(evaluatePredicate(h.run.predicates[0]!, trial.values)).toBe(
      'VIOLATED',
    );
    expect(trial.baseline.id).not.toBe(h.confirmed.baseline.id);
    expect(trial.id).not.toBe(h.confirmed.evidence.trialId);
    expect(dispatch).toHaveBeenCalledTimes(7);
    expect(h.s.snapshot.budget.requestsByPhase).toMatchObject({
      RESET: 3,
      BASELINE: 3,
      EXPLORATION: 6,
      REPLAY: 6,
      MINIMIZATION: 5,
    });
    h.s.finishTrial();
  } finally {
    await h.close();
  }
});
test('ordered deletion reduces supplied six steps to exact same eligible three-step violation with durable fresh evidence', async () => {
  const api = await minimizerBoundary();
  const h = await minimizationHarness();
  try {
    const before = await history(h),
      frozen = structuredClone({
        journey: h.journey,
        finding: h.finding,
        predicate: h.run.predicates[0],
      });
    const dispatch = vi.spyOn(h.s, 'dispatchIntent'),
      admission = vi.spyOn(h.s, 'admitTrial'),
      plan = vi.spyOn(h.s, 'plan');
    const result = MinimizationResultSchema.parse(
      await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
    );
    expect(result.originalLength).toBe(6);
    expect(result.bestLength).toBe(3);
    expect(ids(result.best)).toEqual(required);
    expect(result.best.predicateRef).toEqual(h.finding.predicateRef);
    expect(result.locallyIrreducible).toBe(true);
    expect(result.stopReason).toBe('LOCAL MINIMUM');
    expect(result.stopReason.toLowerCase()).not.toContain('global');
    const accepted = result.attempts.filter((a) => a.accepted);
    expect(accepted.map((a) => a.removedStepId)).toEqual(removable);
    expect(accepted.map((a) => a.candidate.steps.length)).toEqual([5, 4, 3]);
    expect(admission.mock.calls.map((call) => call[1])).toEqual([
      'MINIMIZATION',
      'MINIMIZATION',
      'MINIMIZATION',
    ]);
    expect(dispatch).toHaveBeenCalledTimes(18);
    expect(plan).not.toHaveBeenCalled();
    const baselineIds = new Set([
      h.initial.baseline.id,
      h.confirmed.baseline.id,
    ]);
    const trialIds = new Set([
      h.initial.evidence.trialId,
      h.confirmed.evidence.trialId,
    ]);
    const after = await assertFindingRetained(h, before);
    for (const a of accepted) {
      expect(a.evidence?.outcome).toBe('VIOLATED');
      expect(a.evidence?.predicateRef).toEqual(h.finding.predicateRef);
      expect(a.evidence?.phase).toBe('MINIMIZATION');
      expect(a.baseline?.verdict).toBe('SATISFIED');
      expect(a.evidence?.baselineEvidenceId).toBe(a.baseline?.id);
      expect(a.trialId).toBe(a.baseline?.trialId);
      expect(trialIds.has(a.trialId!)).toBe(false);
      trialIds.add(a.trialId!);
      expect(baselineIds.has(a.baseline!.id)).toBe(false);
      baselineIds.add(a.baseline!.id);
      expect(a.observations.map((o) => o.stepId)).toEqual(ids(a.candidate));
      expect(a.evidence?.observationIds).toEqual(
        a.observations.map((o) => o.id),
      );
      for (const o of a.observations)
        expect(o).toMatchObject({
          runId: h.run.id,
          trialId: a.trialId,
          result: { outcome: 'RESPONSE', truncated: false },
        });
      const storedEvidence = await h.client.query(
        'SELECT evaluation FROM evidence WHERE id=$1 AND run_id=$2',
        [a.evidence!.id, h.run.id],
      );
      expect(storedEvidence.rows[0].evaluation).toEqual(a.evidence);
      const baseline = await h.client.query(
        'SELECT evaluation FROM evidence WHERE id=$1',
        [a.baseline!.id],
      );
      expect(baseline.rows[0].evaluation).toEqual(a.baseline);
      const storedCandidate = await h.client.query(
        "SELECT definition FROM journeys WHERE id=$1 AND phase='MINIMIZATION'",
        [a.candidate.id],
      );
      expect(storedCandidate.rows[0].definition).toEqual(a.candidate);
    }
    // Persist the decision trail, including local rejection reasons, not only
    // successful predicate evidence. Representation may extend existing evidence.
    const serialized = canonical(after.evidence);
    for (const a of result.attempts) {
      expect(serialized).toContain(a.removedStepId);
      expect(serialized).toContain(a.reason);
      expect(serialized).toContain(a.candidate.id);
    }
    expect(FindingSchema.parse(result.finding)).toMatchObject({
      classification: 'CONFIRMED',
      consistent: true,
      originalJourneyId: h.journey.id,
      minimizedJourneyId: result.best.id,
      predicateRef: h.finding.predicateRef,
    });
    const durableFinding = await h.client.query(
      'SELECT minimized_journey_id,minimization_stop FROM findings WHERE id=$1',
      [h.finding.id],
    );
    expect(durableFinding.rows[0]).toMatchObject({
      minimized_journey_id: result.best.id,
      minimization_stop: result.stopReason,
    });
    expect(h.s.snapshot.budget).toMatchObject({
      usedRequests: 34,
      usedExplorationJourneys: 1,
      modelCalls: 0,
      requestsByPhase: {
        RESET: 5,
        BASELINE: 5,
        EXPLORATION: 6,
        REPLAY: 6,
        MINIMIZATION: 12,
      },
    });
    expect({
      journey: h.journey,
      finding: h.finding,
      predicate: h.run.predicates[0],
    }).toEqual(frozen);
    // Re-extraction: response-derived primary IDs differ in all five fresh trials.
    const creates = after.steps.filter((s) => s.step_name === 'create');
    expect(
      new Set(
        creates.map(
          (s) =>
            z
              .object({ body: z.object({ id: z.string() }) })
              .parse(s.sanitized_response).body.id,
        ),
      ).size,
    ).toBe(5);
  } finally {
    await h.close();
  }
});
test('already minimal confirmed journey reaches only local criterion without a target trial', async () => {
  const api = await minimizerBoundary();
  const h = await minimizationHarness(200, true);
  try {
    const before = await history(h),
      dispatch = vi.spyOn(h.s, 'dispatchIntent');
    const result = MinimizationResultSchema.parse(
      await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
    );
    expect(ids(result.best)).toEqual(required);
    expect(result.bestLength).toBe(3);
    expect(result.originalLength).toBe(3);
    expect(result.locallyIrreducible).toBe(true);
    expect(result.stopReason).toBe('LOCAL MINIMUM');
    expect(dispatch).not.toHaveBeenCalled();
    expect(result.attempts.filter((a) => a.accepted)).toHaveLength(0);
    for (const step of required)
      expect(
        result.attempts.some(
          (a) => a.removedStepId === step && !a.accepted && a.reason.length > 0,
        ),
      ).toBe(true);
    await assertFindingRetained(h, before);
  } finally {
    await h.close();
  }
});
test('repaired variant rejects SATISFIED removals, visits candidates once and retains previously verified original', async () => {
  const api = await minimizerBoundary();
  const h = await minimizationHarness();
  try {
    await h.repair();
    const before = await history(h);
    const result = MinimizationResultSchema.parse(
      await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
    );
    expect(ids(result.best)).toEqual(ids(h.journey));
    expect(result.bestLength).toBe(6);
    expect(result.attempts.filter((a) => a.accepted)).toHaveLength(0);
    const executed = result.attempts.filter((a) => a.evidence);
    expect(executed.map((a) => a.removedStepId)).toEqual(removable);
    expect(executed.map((a) => a.evidence?.outcome)).toEqual([
      'SATISFIED',
      'SATISFIED',
      'SATISFIED',
    ]);
    expect(
      new Set(executed.map((a) => canonical({ ...a.candidate, id: null })))
        .size,
    ).toBe(executed.length);
    expect(result.locallyIrreducible).toBe(true);
    expect(result.stopReason).toBe('LOCAL MINIMUM');
    expect(result.attempts.length).toBeLessThanOrEqual(6); // One finite scan, no repeated equivalent candidate.
    await assertFindingRetained(h, before);
  } finally {
    await h.close();
  }
});
test('stable removal order and finite restart scans are independent of generated runtime UUIDs', async () => {
  const api = await minimizerBoundary();
  const outcomes: { removed: string[]; best: string[]; attempts: number }[] =
    [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const h = await minimizationHarness();
    try {
      const result = MinimizationResultSchema.parse(
        await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
      );
      outcomes.push({
        removed: result.attempts
          .filter((a) => a.accepted)
          .map((a) => a.removedStepId),
        best: ids(result.best),
        attempts: result.attempts.length,
      });
      expect(result.attempts.length).toBeLessThanOrEqual(6 * 7);
      const replayed = result.attempts.filter((a) => a.trialId);
      expect(
        new Set(replayed.map((a) => canonical({ ...a.candidate, id: null })))
          .size,
      ).toBe(replayed.length);
    } finally {
      await h.close();
    }
  }
  expect(outcomes[0]).toEqual(outcomes[1]);
  expect(outcomes[0]!.removed).toEqual(removable);
});
for (const [requests, bestLength, extraRequests] of [
  [22, 6, 0],
  [23, 5, 7],
  [28, 5, 7],
] as const)
  test(`all-phase budget ${requests} admits whole candidate or preserves verified best before reset`, async () => {
    const api = await minimizerBoundary();
    const h = await minimizationHarness(requests);
    try {
      const before = await history(h),
        dispatch = vi.spyOn(h.s, 'dispatchIntent');
      const result = MinimizationResultSchema.parse(
        await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
      );
      expect(result.stopReason).toBe('BUDGET EXHAUSTED');
      expect(result.locallyIrreducible).toBe(false);
      expect(result.bestLength).toBe(bestLength);
      expect(result.best.steps).toEqual(
        bestLength === 6
          ? h.journey.steps
          : without(h.journey, 'readBefore').steps,
      );
      expect(dispatch).toHaveBeenCalledTimes(extraRequests);
      const after = await assertFindingRetained(h, before);
      expect(after.steps.length - before.steps.length).toBe(extraRequests);
      expect(result.attempts.filter((a) => a.accepted)).toHaveLength(
        bestLength === 5 ? 1 : 0,
      );
      const counters = await h.client.query(
        'SELECT counters,stop_reason FROM runs WHERE id=$1',
        [h.run.id],
      );
      expect(counters.rows[0].counters.usedRequests).toBe(16 + extraRequests);
      expect(counters.rows[0].stop_reason).toBe('BUDGET EXHAUSTED');
    } finally {
      await h.close();
    }
  });
for (const failure of [
  'reset',
  'baseline',
  'execution',
  'cancel',
  'time',
  'ownership',
] as const)
  test(`${failure} failure stops minimization honestly without accepting a reduction or changing confirmation`, async () => {
    const api = await minimizerBoundary();
    const h = await minimizationHarness();
    try {
      const before = await history(h),
        original = h.s.dispatchIntent.bind(h.s);
      const dispatch = vi.spyOn(h.s, 'dispatchIntent');
      const code =
        failure === 'cancel'
          ? 'CANCELLED'
          : failure === 'time'
            ? 'TIME EXHAUSTED'
            : failure === 'ownership'
              ? 'OWNERSHIP LOST'
              : failure === 'execution'
                ? 'EXECUTION ERROR'
                : 'BASELINE ERROR';
      if (failure === 'cancel') h.s.cancel();
      else if (failure === 'time' || failure === 'ownership')
        h.s.closeGate(code);
      else
        dispatch.mockImplementation(async (intent) => {
          const step = z.object({ stepId: z.string() }).parse(intent).stepId;
          if (
            step ===
            (failure === 'reset'
              ? 'reset'
              : failure === 'baseline'
                ? 'baseline'
                : 'create')
          )
            throw new Error('EXECUTION ERROR');
          return original(intent);
        });
      const result = MinimizationResultSchema.parse(
        await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
      );
      expect(result.stopReason).toBe(code);
      expect(result.locallyIrreducible).toBe(false);
      expect(result.best.steps).toEqual(h.journey.steps);
      expect(result.attempts.filter((a) => a.accepted)).toHaveLength(0);
      expect(
        result.attempts.filter((a) => a.evidence?.outcome === 'VIOLATED'),
      ).toHaveLength(0);
      if (failure === 'cancel' || failure === 'time' || failure === 'ownership')
        expect(dispatch).not.toHaveBeenCalled();
      else
        expect(dispatch).toHaveBeenCalledTimes(
          failure === 'reset' ? 1 : failure === 'baseline' ? 2 : 3,
        );
      const after = await assertFindingRetained(h, before);
      expect(after.evidence.filter((e) => e.kind === 'PREDICATE')).toHaveLength(
        2,
      );
      const run = await h.client.query(
        'SELECT status,stop_reason FROM runs WHERE id=$1',
        [h.run.id],
      );
      expect(run.rows[0]).toMatchObject({
        status: 'STOPPED',
        stop_reason: code,
      });
    } finally {
      await h.close();
    }
  });
test('cancellation between attempts retains first independently verified reduction and schedules no further reset', async () => {
  const api = await minimizerBoundary();
  const h = await minimizationHarness();
  try {
    const finish = h.s.finishTrial.bind(h.s),
      dispatch = vi.spyOn(h.s, 'dispatchIntent');
    vi.spyOn(h.s, 'finishTrial').mockImplementation(() => {
      finish();
      h.s.cancel();
    });
    const result = MinimizationResultSchema.parse(
      await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
    );
    expect(result.stopReason).toBe('CANCELLED');
    expect(result.locallyIrreducible).toBe(false);
    expect(result.best.steps).toEqual(without(h.journey, 'readBefore').steps);
    expect(result.attempts.filter((a) => a.accepted)).toHaveLength(1);
    expect(dispatch).toHaveBeenCalledTimes(7);
  } finally {
    await h.close();
  }
});
for (const mismatch of [
  'predicate ID',
  'predicate version',
  'predicate hash',
  'journey edit',
  'not confirmed',
  'inconsistent',
  'scope edit',
] as const)
  test(`preflight ${mismatch} cannot reuse confirmed evidence or consume budget`, async () => {
    const api = await minimizerBoundary();
    const h = await minimizationHarness();
    try {
      const before = await history(h),
        run = structuredClone(h.run),
        journey = structuredClone(h.journey),
        finding = structuredClone(h.finding);
      if (mismatch === 'predicate ID') journey.predicateRef.id = randomUUID();
      if (mismatch === 'predicate version') journey.predicateRef.version++;
      if (mismatch === 'predicate hash')
        journey.predicateRef.hash = '0'.repeat(64);
      if (mismatch === 'journey edit')
        journey.steps[0]!.operationId = 'POST /api/control/reset';
      if (mismatch === 'not confirmed')
        finding.classification = 'OBSERVED VIOLATION';
      if (mismatch === 'inconsistent') finding.consistent = false;
      if (mismatch === 'scope edit') run.scope.origin = 'http://127.0.0.1:1';
      const dispatch = vi.spyOn(h.s, 'dispatchIntent');
      await expect(
        api.minimizeFinding(h.s, run, journey, finding),
      ).rejects.toThrow();
      expect(dispatch).not.toHaveBeenCalled();
      expect(await history(h)).toEqual(before);
      expect(h.s.snapshot.budget.usedRequests).toBe(16);
    } finally {
      await h.close();
    }
  });
test('closed supervisor gate after confirmation prevents any alternate transport', async () => {
  const api = await minimizerBoundary();
  const h = await minimizationHarness();
  try {
    await h.s.stop('SHUTDOWN');
    const before = await history(h),
      dispatch = vi.spyOn(h.s, 'dispatchIntent');
    const result = MinimizationResultSchema.parse(
      await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
    );
    expect(result.stopReason).toBe('SHUTDOWN');
    expect(result.bestLength).toBe(6);
    expect(dispatch).not.toHaveBeenCalled();
    await assertFindingRetained(h, before);
  } finally {
    await h.close();
  }
});

test('setup: expected final three-step candidate reproduces exact violation after fresh minimization reset', async () => {
  const h = await minimizationHarness();
  try {
    // Explicit supplied expectation, not an implementation of greedy deletion.
    const candidate = JourneySchema.parse({
      ...h.journey,
      id: randomUUID(),
      steps: h.journey.steps.filter((s) => required.includes(s.id)),
      dependencies: h.journey.dependencies.filter((d) =>
        required.includes(d.consumer),
      ),
    });
    const trial = await establishFreshState(
      h.s,
      h.run,
      candidate,
      'MINIMIZATION',
      {},
    );
    await executeJourney(h.s, h.run, candidate, trial);
    expect(ids(candidate)).toEqual(required);
    expect(candidate.predicateRef).toEqual(h.finding.predicateRef);
    expect(evaluatePredicate(h.run.predicates[0]!, trial.values)).toBe(
      'VIOLATED',
    );
    expect(trial.baseline.id).not.toBe(h.confirmed.baseline.id);
    h.s.finishTrial();
  } finally {
    await h.close();
  }
});
for (const failure of ['reset', 'execution'] as const)
  test(`${failure} failure after one accepted reduction retains its exact evidence and best journey`, async () => {
    const api = await minimizerBoundary();
    const h = await minimizationHarness();
    try {
      const before = await history(h),
        dispatch = h.s.dispatchIntent.bind(h.s),
        finish = h.s.finishTrial.bind(h.s);
      let firstFinished = false;
      vi.spyOn(h.s, 'finishTrial').mockImplementation(() => {
        finish();
        firstFinished = true;
      });
      vi.spyOn(h.s, 'dispatchIntent').mockImplementation(async (intent) => {
        const { stepId } = z.object({ stepId: z.string() }).parse(intent);
        if (
          firstFinished &&
          stepId === (failure === 'reset' ? 'reset' : 'create')
        )
          throw new Error('EXECUTION ERROR');
        return dispatch(intent);
      });
      const result = MinimizationResultSchema.parse(
        await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
      );
      expect(result.stopReason).toBe(
        failure === 'reset' ? 'BASELINE ERROR' : 'EXECUTION ERROR',
      );
      expect(result.locallyIrreducible).toBe(false);
      expect(result.best.steps).toEqual(without(h.journey, 'readBefore').steps);
      const accepted = result.attempts.filter((a) => a.accepted);
      expect(accepted).toHaveLength(1);
      expect(accepted[0]!.evidence!.outcome).toBe('VIOLATED');
      const after = await assertFindingRetained(h, before);
      expect(
        after.evidence.some((e) => e.id === accepted[0]!.evidence!.id),
      ).toBe(true);
      expect(after.evidence.filter((e) => e.kind === 'PREDICATE')).toHaveLength(
        3,
      );
      expect(
        result.attempts.some(
          (a) =>
            !a.accepted &&
            a.executionOutcome ===
              (failure === 'reset' ? 'BASELINE ERROR' : 'EXECUTION ERROR'),
        ),
      ).toBe(true);
    } finally {
      await h.close();
    }
  });
test('cancellation during durable intent blocks dispatch, conservatively charges existing budget and retains best', async () => {
  const api = await minimizerBoundary();
  const h = await minimizationHarness();
  try {
    const before = await history(h),
      original = h.s.repository.intent.bind(h.s.repository);
    vi.spyOn(h.s.repository, 'intent').mockImplementation(
      async (intent, budget) => {
        await original(intent, budget);
        h.s.cancel();
      },
    );
    const result = MinimizationResultSchema.parse(
      await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
    );
    expect(result.stopReason).toBe('CANCELLED');
    expect(result.bestLength).toBe(6);
    expect(result.attempts.filter((a) => a.accepted)).toHaveLength(0);
    const after = await assertFindingRetained(h, before);
    const extra = after.steps.filter(
      (s) => !before.steps.some((old) => old.id === s.id),
    );
    expect(extra).toHaveLength(1);
    expect(extra[0].step_name).toBe('reset');
    expect(extra[0].outcome).not.toBe('RESPONSE'); // Intent only, no target response.
    const run = await h.client.query('SELECT counters FROM runs WHERE id=$1', [
      h.run.id,
    ]);
    expect(run.rows[0].counters.usedRequests).toBe(17);
    expect(run.rows[0].counters.requestsByPhase.RESET).toBe(3);
  } finally {
    await h.close();
  }
});
test('durable intent storage failure cannot authorize target dispatch or accept a deletion', async () => {
  const api = await minimizerBoundary();
  const h = await minimizationHarness();
  try {
    const before = await history(h);
    vi.spyOn(h.s.repository, 'intent').mockRejectedValue(
      new Error('STORAGE ERROR'),
    );
    const result = MinimizationResultSchema.parse(
      await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
    );
    expect(result.stopReason).toBe('STORAGE ERROR');
    expect(result.bestLength).toBe(6);
    expect(result.attempts.filter((a) => a.accepted)).toHaveLength(0);
    const after = await assertFindingRetained(h, before);
    expect(after.steps).toEqual(before.steps);
    expect(after.evidence.filter((e) => e.kind === 'PREDICATE')).toHaveLength(
      2,
    );
    const run = await h.client.query('SELECT counters FROM runs WHERE id=$1', [
      h.run.id,
    ]);
    // Existing dispatcher charges conservatively before persistence. Do not
    // require a refund when intent write fails; no independent minimizer counter.
    expect(run.rows[0].counters.usedRequests).toBeGreaterThanOrEqual(16);
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
  test(`invalid ${defect} baseline cannot authorize a candidate journey or a preserving verdict`, async () => {
    const api = await minimizerBoundary();
    const h = await minimizationHarness();
    try {
      const before = await history(h),
        establish = h.s.establishBaseline.bind(h.s);
      // Fault injection at the existing baseline boundary, not fixture mutation
      // or a second target transport. Malformed values must be checked at runtime.
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
      const result = MinimizationResultSchema.parse(
        await api.minimizeFinding(h.s, h.run, h.journey, h.finding),
      );
      expect(result.stopReason).toBe('BASELINE ERROR');
      expect(result.locallyIrreducible).toBe(false);
      expect(result.best.steps).toEqual(h.journey.steps);
      expect(result.attempts.filter((a) => a.accepted)).toHaveLength(0);
      const after = await assertFindingRetained(h, before);
      const added = after.steps.filter(
        (s) => !before.steps.some((old) => old.id === s.id),
      );
      expect(added.map((s) => s.phase).sort()).toEqual(['BASELINE', 'RESET']);
      expect(after.evidence.filter((e) => e.kind === 'PREDICATE')).toHaveLength(
        2,
      );
    } finally {
      await h.close();
    }
  });
