import { expect, test } from 'vitest';
import { makeJourney } from '../helpers/journey';
import { establishFreshState } from '../../src/engine/fresh-state/manager';
import { freshHarness } from '../helpers/fresh';
for (const phase of [
  'EXPLORATION',
  'REPLAY',
  'MINIMIZATION',
  'ARTIFACT',
] as const)
  test(`fresh baseline required for ${phase}`, async () => {
    const h = await freshHarness();
    try {
      const j = makeJourney();
      const trial = await establishFreshState(h.s, h.run, j, phase, {});
      expect(trial.baseline.trialId).toBe(trial.id);
      expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
      await h.s.dispatchIntent({
        kind: 'EXECUTE',
        runId: h.run.id,
        trialId: trial.id,
        stepId: 'inspect',
        operationId: 'GET /api/item',
        input: { path: {}, query: {}, headers: {} },
      });
      h.s.finishTrial();
      const next = await establishFreshState(h.s, h.run, j, phase, {});
      expect(next.id).not.toBe(trial.id);
      expect(next.baseline.id).not.toBe(trial.baseline.id);
    } finally {
      await h.close();
    }
  });
test('failed baseline stops before journey and no cleanup', async () => {
  const h = await freshHarness(503);
  try {
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BASELINE ERROR');
    expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
    expect(() => h.s.assertAuthority()).toThrow('BASELINE ERROR');
  } finally {
    await h.close();
  }
});
test('short by one full-trial admission dispatches no reset', async () => {
  const h = await freshHarness(200, 2);
  try {
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BUDGET EXHAUSTED');
    expect(h.calls).toEqual([]);
  } finally {
    await h.close();
  }
});
test('caller cannot assert baseline before reset/check execution', async () => {
  const h = await freshHarness();
  try {
    h.s.admitTrial(makeJourney(), 'EXPLORATION');
    await expect(h.s.establishBaseline()).rejects.toThrow(
      'BASELINE INCOMPLETE',
    );
    expect(h.calls).toEqual([]);
  } finally {
    await h.close();
  }
});

import { randomUUID } from 'node:crypto';
import {
  JsonSchema,
  ResetConfigurationSchema,
} from '../../src/engine/contracts';
import { predicateHash } from '../../src/engine/detection/predicate';
function fieldAssertion(
  run: ReturnType<typeof makeRun>,
  stepId = 'read',
  pointer = '/accounts',
  value = 0,
) {
  const p = structuredClone(run.reset.baselineAssertions[0]!.predicate);
  p.id = randomUUID();
  p.assertions = [
    {
      op: 'equals',
      left: { kind: 'json', stepId, pointer },
      right: { kind: 'literal', value },
    },
  ];
  p.canonicalHash = predicateHash(p);
  return { id: randomUUID(), predicate: p };
}
import { makeRun } from '../helpers/run';
test('empty baseline assertions are rejected before acceptance', () => {
  const run = makeRun(randomUUID());
  expect(() =>
    ResetConfigurationSchema.parse({ ...run.reset, baselineAssertions: [] }),
  ).toThrow();
});
for (const body of [{ accounts: 1 }, {}])
  test(`partial or unverifiable baseline ${JSON.stringify(body)} stops before journey`, async () => {
    const h = await freshHarness(200, 200, {
      baselineBody: JsonSchema.parse(body),
      configure: (run) => {
        run.reset.baselineAssertions = [fieldAssertion(run)];
      },
    });
    try {
      await expect(
        establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
      ).rejects.toThrow('BASELINE ERROR');
      expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
      expect(
        (
          await h.client.query(
            "SELECT count(*)::int AS count FROM evidence WHERE kind='BASELINE'",
          )
        ).rows[0],
      ).toEqual({ count: 0 });
      expect(
        (await h.client.query('SELECT status,stop_reason FROM runs')).rows[0],
      ).toEqual({ status: 'STOPPED', stop_reason: 'BASELINE ERROR' });
    } finally {
      await h.close();
    }
  });
test('failed reset status prevents baseline, retry and cleanup', async () => {
  const h = await freshHarness(200, 200, { resetStatus: 500 });
  try {
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BASELINE ERROR');
    expect(h.calls).toEqual(['/api/reset']);
  } finally {
    await h.close();
  }
});
test('violated reset assertions prevent baseline inspection', async () => {
  const h = await freshHarness(200, 200, {
    configure: (run) => {
      run.reset.resetAssertions = [fieldAssertion(run, 'reset', '/reset', 0)];
    },
  });
  try {
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BASELINE ERROR');
    expect(h.calls).toEqual(['/api/reset']);
  } finally {
    await h.close();
  }
});
test('reset timeout charges once and stops without baseline or cleanup', async () => {
  const h = await freshHarness(200, 200, {
    delayMs: 50,
    configure: (run) => {
      run.budget.limits.requestTimeoutMs = 10;
    },
  });
  try {
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BASELINE ERROR');
    expect(h.calls).toEqual(['/api/reset']);
    expect(
      (await h.client.query('SELECT counters FROM runs')).rows[0].counters
        .usedRequests,
    ).toBe(1);
    expect(() => h.s.assertAuthority()).toThrow('BASELINE ERROR');
  } finally {
    await h.close();
  }
});
test('exact full-trial budget admits reset baseline and journey under one counter', async () => {
  const h = await freshHarness(200, 3);
  try {
    const trial = await establishFreshState(
      h.s,
      h.run,
      makeJourney(),
      'EXPLORATION',
      {},
    );
    await h.s.dispatchIntent({
      kind: 'EXECUTE',
      runId: h.run.id,
      trialId: trial.id,
      stepId: 'inspect',
      operationId: 'GET /api/item',
      input: { path: {}, query: {}, headers: {} },
    });
    h.s.finishTrial();
    expect(
      (await h.client.query('SELECT counters FROM runs')).rows[0].counters
        .requestsByPhase,
    ).toMatchObject({ RESET: 1, BASELINE: 1, EXPLORATION: 1 });
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BUDGET EXHAUSTED');
    expect(h.calls).toEqual(['/api/reset', '/api/baseline', '/api/item']);
  } finally {
    await h.close();
  }
});
test('duplicate baseline admission and forged phase fields cannot advance trial', async () => {
  const h = await freshHarness();
  try {
    const trial = await establishFreshState(
      h.s,
      h.run,
      makeJourney(),
      'EXPLORATION',
      {},
    );
    await expect(h.s.establishBaseline()).rejects.toThrow(
      'BASELINE INCOMPLETE',
    );
    await expect(
      h.s.dispatchIntent({
        kind: 'EXECUTE',
        phase: 'RESET',
        runId: h.run.id,
        trialId: trial.id,
        stepId: 'inspect',
        operationId: 'GET /api/item',
        input: { path: {}, query: {}, headers: {} },
      }),
    ).rejects.toThrow();
    expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
  } finally {
    await h.close();
  }
});
test('known external interference invalidates current baseline and prevents dispatch', async () => {
  const h = await freshHarness();
  try {
    const trial = await establishFreshState(
      h.s,
      h.run,
      makeJourney(),
      'EXPLORATION',
      {},
    );
    await h.s.invalidateTrial();
    await expect(
      h.s.dispatchIntent({
        kind: 'EXECUTE',
        runId: h.run.id,
        trialId: trial.id,
        stepId: 'inspect',
        operationId: 'GET /api/item',
        input: { path: {}, query: {}, headers: {} },
      }),
    ).rejects.toThrow('BASELINE ERROR');
    expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
    expect(
      (await h.client.query('SELECT stop_reason FROM runs')).rows[0]
        .stop_reason,
    ).toBe('BASELINE ERROR');
  } finally {
    await h.close();
  }
});
test('cancelled baseline persistence never authorizes journey or cleanup', async () => {
  const h = await freshHarness();
  try {
    const baseline = h.s.repository.baseline.bind(h.s.repository);
    h.s.repository.baseline = async (value) => {
      await baseline(value);
      h.s.cancel();
    };
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('CANCELLED');
    expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
    expect(() => h.s.assertAuthority()).toThrow('CANCELLED');
  } finally {
    await h.close();
  }
});
test('baseline storage failure cannot authorize execution', async () => {
  const h = await freshHarness();
  try {
    h.s.repository.baseline = async () => {
      throw new Error('database unavailable');
    };
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BASELINE ERROR');
    expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
  } finally {
    await h.close();
  }
});
test('partial multi-step reset stops after the failed step with completed evidence', async () => {
  const h = await freshHarness(200, 200, {
    resetStatuses: [200, 500],
    configure: (run) => {
      run.reset.resetSteps.push({
        ...structuredClone(run.reset.resetSteps[0]!),
        id: 'resetAgain',
      });
    },
  });
  try {
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BASELINE ERROR');
    expect(h.calls).toEqual(['/api/reset', '/api/reset']);
    expect(
      (
        await h.client.query(
          'SELECT step_name,outcome FROM step_records ORDER BY ordinal',
        )
      ).rows,
    ).toEqual([
      { step_name: 'reset', outcome: 'RESPONSE' },
      { step_name: 'resetAgain', outcome: 'RESPONSE' },
    ]);
  } finally {
    await h.close();
  }
});
test('control extractions exist before reset and baseline assertion evaluation', async () => {
  const h = await freshHarness(200, 200, {
    baselineBody: { accounts: 0 },
    configure: (run) => {
      run.reset.resetSteps[0]!.extracts = [
        {
          name: 'wasReset',
          expectedType: 'boolean',
          source: { kind: 'json', stepId: 'reset', pointer: '/reset' },
          sensitive: false,
        },
      ];
      const reset = fieldAssertion(run, 'reset', '/reset');
      reset.predicate.assertions = [
        {
          op: 'equals',
          left: { kind: 'variable', name: 'wasReset' },
          right: { kind: 'literal', value: true },
        },
      ];
      reset.predicate.canonicalHash = predicateHash(reset.predicate);
      run.reset.resetAssertions = [reset];
      run.reset.checkSteps[0]!.extracts = [
        {
          name: 'count',
          expectedType: 'integer',
          source: { kind: 'json', stepId: 'read', pointer: '/accounts' },
          sensitive: false,
        },
      ];
      const baseline = fieldAssertion(run);
      baseline.predicate.assertions[0]!.left = {
        kind: 'variable',
        name: 'count',
      };
      baseline.predicate.canonicalHash = predicateHash(baseline.predicate);
      run.reset.baselineAssertions = [baseline];
    },
  });
  try {
    const trial = await establishFreshState(
      h.s,
      h.run,
      makeJourney(),
      'EXPLORATION',
      {},
    );
    expect(trial.values.vault.get('count')).toBe(0);
    expect(trial.values.vault.get('wasReset')).toBe(true);
  } finally {
    await h.close();
  }
});
test('mutable caller configuration cannot replace supervisor-frozen reset steps', async () => {
  const h = await freshHarness();
  try {
    h.run.reset.resetSteps = [];
    h.run.reset.checkSteps = [];
    await establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {});
    expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
  } finally {
    await h.close();
  }
});
test('missing configured values fail before reset without fabricated inputs', async () => {
  const h = await freshHarness();
  try {
    const j = makeJourney();
    j.variables = [
      {
        name: 'id',
        expectedType: 'string',
        source: { kind: 'input', key: 'missing' },
        sensitive: false,
      },
    ];
    await expect(
      establishFreshState(h.s, h.run, j, 'EXPLORATION', {}),
    ).rejects.toThrow('EXECUTION ERROR');
    expect(h.calls).toEqual([]);
  } finally {
    await h.close();
  }
});
test('failed checks persist symbolic assertion references and deterministic outcomes', async () => {
  const h = await freshHarness(200, 200, {
    baselineBody: { accounts: 1 },
    configure: (run) => {
      run.reset.baselineAssertions = [fieldAssertion(run)];
    },
  });
  try {
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BASELINE ERROR');
    const rows = await h.client.query(
      "SELECT evaluation FROM evidence WHERE kind='BASELINE FAILURE'",
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].evaluation.assertions[0]).toMatchObject({
      assertionId: h.run.reset.baselineAssertions[0]!.id,
      phase: 'BASELINE',
      outcome: 'VIOLATED',
    });
    expect(rows.rows[0].evaluation.assertions[0]).not.toHaveProperty(
      'operands',
    );
  } finally {
    await h.close();
  }
});
test('duplicate control and journey step names reject admission before reset', async () => {
  const h = await freshHarness();
  try {
    const j = makeJourney();
    j.steps[0]!.id = 'reset';
    await expect(
      establishFreshState(h.s, h.run, j, 'EXPLORATION', {}),
    ).rejects.toThrow('EXECUTION ERROR');
    expect(h.calls).toEqual([]);
  } finally {
    await h.close();
  }
});
test('truncated required baseline evidence fails closed', async () => {
  const h = await freshHarness(200, 200, {
    baselineBody: { accounts: 0, padding: 'x'.repeat(1048576) },
    configure: (run) => {
      run.reset.baselineAssertions = [fieldAssertion(run)];
    },
  });
  try {
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('BASELINE ERROR');
    expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
    expect(
      (
        await h.client.query(
          "SELECT sanitized_response FROM step_records WHERE step_name='read'",
        )
      ).rows[0].sanitized_response.truncated,
    ).toBe(true);
  } finally {
    await h.close();
  }
});
