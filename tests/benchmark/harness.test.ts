import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { defaultLimits } from '../../src/engine/budget/manager';
import { buildPlanningContext } from '../../src/engine/planning/context';
import { SecretVault } from '../../src/engine/secrets/vault';
const boundary = () => import('../../src/cli/benchmark');
const required = () => import('../../fixtures/required');
const identity = { provider: 'controlled', model: 'test-model' } as const;

test('required selection is exactly the T045 suite; absent optional selection fails closed', async () => {
  const b = await boundary(),
    s = await b.selectSuite('required');
  expect(s.fixtures.map((f) => f.id)).toEqual([
    'order-lifecycle',
    'inventory',
    'workflow',
  ]);
  await expect(b.selectSuite('supplemental')).rejects.toThrow(
    'SUPPLEMENTAL SUITE UNAVAILABLE',
  );
});
test('five fresh assignments per required variant, unique identities and stable selection order', async () => {
  const b = await boundary(),
    suite = await b.selectSuite('required'),
    assignments = b.assignTrials(suite, 'AUTONOMOUS_DISCOVERY');
  expect(assignments).toHaveLength(30);
  expect(new Set(assignments.map((a) => a.runId)).size).toBe(30);
  for (const fixture of suite.fixtures)
    for (const variant of ['faulty', 'repaired'])
      expect(
        assignments
          .filter((a) => a.fixtureId === fixture.id && a.variant === variant)
          .map((a) => a.repetition),
      ).toEqual([1, 2, 3, 4, 5]);
});
test('assigned failed, interrupted and error trials remain in five-trial denominators', async () => {
  const b = await boundary(),
    suite = await b.selectSuite('required');
  let calls = 0;
  const records = await b.runBenchmark({
    suite,
    mode: 'AUTONOMOUS_DISCOVERY',
    execute: async (a) => {
      calls++;
      if (a.repetition === 1)
        throw Error('secret-bearing unexpected exception');
      return b.emptyRecord(a, a.repetition === 2 ? 'CANCELLED' : 'MODEL ERROR');
    },
  });
  expect(records).toHaveLength(30);
  expect(calls).toBe(30);
  expect(JSON.stringify(records)).not.toContain('secret-bearing');
  for (const row of b.summarizeBenchmark(records)) {
    expect(row.denominator).toBe(5);
    expect(row.discoveryRate).toBe(0);
    expect(row.confirmationRate).toBe(0);
    if (row.variant === 'repaired') expect(row.falsePositiveRate).toBe(0);
  }
});
test('discovery and confirmation rates are distinct and use all five assigned trials', async () => {
  const b = await boundary(),
    suite = await b.selectSuite('required');
  const records = await b.runBenchmark({
    suite,
    mode: 'AUTONOMOUS_DISCOVERY',
    execute: async (a) => ({
      ...b.emptyRecord(a, 'TEST COMPLETE'),
      discoveryStatus: a.repetition < 5 ? 'OBSERVED VIOLATION' : 'NOT OBSERVED',
      confirmationStatus: a.repetition < 4 ? 'CONFIRMED' : 'INCONCLUSIVE',
    }),
  });
  for (const row of b.summarizeBenchmark(records)) {
    expect(row.denominator).toBe(5);
    expect(row.discoveryRate).toBe(0.8);
    expect(row.confirmationRate).toBe(0.6);
  }
});
test('cancellation preserves all assigned records without dispatching remaining assignments', async () => {
  const b = await boundary(),
    controller = new AbortController();
  let calls = 0;
  const records = await b.runBenchmark({
    suite: await b.selectSuite('required'),
    mode: 'AUTONOMOUS_DISCOVERY',
    signal: controller.signal,
    execute: async (a) => {
      calls++;
      controller.abort();
      return b.emptyRecord(a, 'CANCELLED');
    },
  });
  expect(calls).toBe(1);
  expect(records).toHaveLength(30);
  expect(records.every((r) => r.stopReason === 'CANCELLED')).toBe(true);
});
test('supplied redundancy is separate and cannot enter autonomous denominators', async () => {
  const b = await boundary(),
    suite = await b.selectSuite('required');
  const assignments = b.assignTrials(suite, 'SUPPLIED_REDUNDANCY');
  expect(assignments).toHaveLength(3);
  expect(assignments.every((a) => a.variant === 'faulty')).toBe(true);
  const records = assignments.map((a) => ({
    ...b.emptyRecord(a, 'TEST COMPLETE'),
    discoveryStatus: 'NOT MEASURED' as const,
    confirmationStatus: 'CONFIRMED' as const,
  }));
  expect(b.summarizeBenchmark(records)).toEqual([]);
});
test('token telemetry prefers provider counts, estimates UTF-8 bytes and never invents failed output', async () => {
  const b = await boundary();
  expect(b.tokenMetric(8, false, 'abcd')).toEqual({
    value: 8,
    source: 'PROVIDER',
  });
  expect(b.tokenMetric(undefined, true, 'ééé')).toEqual({
    value: 2,
    source: 'ESTIMATED',
  });
  expect(b.tokenMetric(undefined, true, undefined)).toEqual({
    value: null,
    source: 'UNKNOWN',
  });
});
test('frozen identity is deterministic and binds model, configuration, engine, prompt, dependencies and fixtures', async () => {
  const b = await boundary(),
    suite = await b.selectSuite('required');
  const a = await b.freezeBenchmark(suite, identity, 'AUTONOMOUS_DISCOVERY'),
    same = await b.freezeBenchmark(suite, identity, 'AUTONOMOUS_DISCOVERY'),
    changed = await b.freezeBenchmark(
      suite,
      { ...identity, model: 'other-model' },
      'AUTONOMOUS_DISCOVERY',
    );
  expect(a).toEqual(same);
  expect(a.modelHash).not.toBe(changed.modelHash);
  expect(a.configurationHash).not.toBe(changed.configurationHash);
  for (const key of [
    'engineHash',
    'promptHash',
    'dependencyHash',
    'modelHash',
    'fixtureHash',
    'configurationHash',
    'buildHash',
  ] as const)
    expect(a[key]).toMatch(/^[a-f0-9]{64}$/);
  expect(a.configuration.limits).toEqual(defaultLimits);
  expect(a.configuration.trialsPerVariant).toBe(5);
});
test('build drift fails closed for remaining records rather than retrying or dropping assignments', async () => {
  const b = await boundary();
  let admitted = 0,
    checks = 0;
  const records = await b.runBenchmark({
    suite: await b.selectSuite('required'),
    mode: 'AUTONOMOUS_DISCOVERY',
    assertFrozen: async () => {
      if (++checks > 1) throw Error('BUILD CHANGED');
    },
    execute: async (a) => {
      admitted++;
      return b.emptyRecord(a, 'MODEL ERROR');
    },
  });
  expect(admitted).toBe(1);
  expect(records).toHaveLength(30);
  expect(records.slice(1).every((r) => r.stopReason === 'BUILD CHANGED')).toBe(
    true,
  );
});
test('journal records assignments before execution, retains final errors and refuses overwrite', async () => {
  const b = await boundary(),
    dir = await mkdtemp(join(tmpdir(), 'ghostqa-harness-'));
  try {
    const suite = await b.selectSuite('required'),
      freeze = await b.freezeBenchmark(suite, identity, 'AUTONOMOUS_DISCOVERY');
    const records = await b.runBenchmark({
      suite,
      mode: 'AUTONOMOUS_DISCOVERY',
      directory: dir,
      freeze,
      execute: async (a) => {
        expect(
          (await readdir(dir)).some((n) => n === `${a.ordinal}-assigned.json`),
        ).toBe(true);
        return b.emptyRecord(a, 'MODEL ERROR');
      },
    });
    expect(records).toHaveLength(30);
    expect(
      JSON.parse(await readFile(join(dir, 'series.json'), 'utf8')).assignments,
    ).toHaveLength(30);
    expect(
      (await readdir(dir)).filter((n) => n.endsWith('-result.json')),
    ).toHaveLength(30);
    await expect(
      b.runBenchmark({
        suite,
        mode: 'AUTONOMOUS_DISCOVERY',
        directory: dir,
        freeze,
        execute: async (a) => b.emptyRecord(a, 'MODEL ERROR'),
      }),
    ).rejects.toThrow();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
for (const fixtureId of ['order-lifecycle', 'inventory', 'workflow'] as const)
  test(`${fixtureId}: blinded configuration and supplied redundancy use only approved neutral context`, async () => {
    const b = await boundary(),
      r = await required(),
      entry = (await b.selectSuite('required')).fixtures.find(
        (f) => f.id === fixtureId,
      )!;
    const first = await r.startRequiredFixture(entry, false),
      second = await r.startRequiredFixture(entry, true);
    try {
      const run = await r.requiredConfiguration(
        entry,
        first.openapi,
        first.url,
        identity,
      );
      expect(first.openapi).toEqual(second.openapi);
      const context = buildPlanningContext(
        {
          run,
          mappings: [],
          observations: [],
          symbolicInputs: {},
          consideredHypothesisHashes: [],
        },
        new SecretVault(),
      );
      expect(context.api.operations).toHaveLength(4);
      expect(JSON.stringify(context)).not.toMatch(
        /control\/|faulty|repaired|evaluator|"actions"|inconsistentState|repairedState/,
      );
      expect(run.modelConfiguration).toEqual(identity);
      expect(run.budget.limits).toEqual(defaultLimits);
      const journey = r.evaluatorJourney(entry, run, true);
      expect(journey.steps).toHaveLength(4);
      expect(journey.steps.some((s) => s.id === 'redundant')).toBe(true);
    } finally {
      await first.close();
      await second.close();
    }
  });
test('real supervised harness trial captures fresh evidence, phase counters and telemetry without live Gemini', async () => {
  const b = await boundary(),
    r = await required(),
    suite = await b.selectSuite('required'),
    entry = suite.fixtures[1]!,
    a = b
      .assignTrials(suite, 'AUTONOMOUS_DISCOVERY')
      .find((a) => a.fixtureId === entry.id && a.variant === 'faulty')!;
  const result = await b.executeBenchmarkTrial(a, entry, {
    databaseUrl: process.env.TEST_DATABASE_URL!,
    identity,
    providerFor: (run) => ({
      identity,
      propose: async (context) => {
        expect(JSON.stringify(context)).not.toMatch(
          /"actions"|faulty|repaired|evaluator|control\//,
        );
        return {
          proposal: r.evaluatorJourney(entry, run),
          ...identity,
          usage: { inputTokens: 7, outputTokens: 9, estimated: false },
        };
      },
    }),
  });
  expect(result.discoveryStatus).toBe('OBSERVED VIOLATION');
  expect(result.confirmationStatus).toBe('CONFIRMED');
  expect(result.artifactStatus).toBe('VERIFIED');
  expect(result.metrics.phaseRequests).toEqual({
    RESET: 3,
    BASELINE: 3,
    EXPLORATION: 3,
    REPLAY: 3,
    MINIMIZATION: 0,
    ARTIFACT: 3,
  });
  expect(result.metrics.requests).toBe(15);
  expect(result.metrics.modelCalls).toBe(1);
  expect(result.metrics.journeys).toBe(1);
  expect(result.metrics.inputTokens).toEqual({ value: 7, source: 'PROVIDER' });
  expect(result.baselines).toHaveLength(3);
  expect(new Set(result.baselines.map((v) => v.trialId)).size).toBe(3);
  expect(result.metrics.originalLength).toBe(3);
  expect(result.metrics.bestLength).toBe(3);
});
test('failed provider call records its attempt and input estimate, with UNKNOWN output and zero target requests', async () => {
  const b = await boundary(),
    suite = await b.selectSuite('required'),
    entry = suite.fixtures[0]!,
    a = b.assignTrials(suite, 'AUTONOMOUS_DISCOVERY')[0]!;
  const result = await b.executeBenchmarkTrial(a, entry, {
    databaseUrl: process.env.TEST_DATABASE_URL!,
    identity,
    providerFor: () => ({
      identity,
      propose: async () => {
        throw Error('private exception');
      },
    }),
  });
  expect(result.stopReason).toBe('MODEL ERROR');
  expect(result.metrics.modelCalls).toBe(1);
  expect(result.metrics.requests).toBe(0);
  expect(result.metrics.inputTokens.source).toBe('ESTIMATED');
  expect(result.metrics.outputTokens).toEqual({
    value: null,
    source: 'UNKNOWN',
  });
  expect(JSON.stringify(result)).not.toContain('private exception');
});
test('CLI requires explicit local-fixture approval and output; ordinary import does not launch a benchmark', async () => {
  const b = await boundary();
  await expect(b.benchmarkMain([])).rejects.toThrow('USAGE');
  await expect(b.benchmarkMain(['--output', 'somewhere'])).rejects.toThrow(
    'USAGE',
  );
});

test('crash inspection retains uncompleted assignments and never resumes execution', async () => {
  const b = await boundary(),
    dir = await mkdtemp(join(tmpdir(), 'ghostqa-crash-ledger-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    const assignments = b.assignTrials(
      await b.selectSuite('required'),
      'AUTONOMOUS_DISCOVERY',
    );
    await writeFile(join(dir, 'series.json'), JSON.stringify({ assignments }));
    await writeFile(
      join(dir, '1-result.json'),
      JSON.stringify(b.emptyRecord(assignments[0]!, 'MODEL ERROR')),
    );
    const recovered = await b.readBenchmark(dir);
    expect(recovered.records).toHaveLength(30);
    expect(recovered.rates.every((r) => r.denominator === 5)).toBe(true);
    expect(
      recovered.records
        .slice(1)
        .every((r) => r.stopReason === 'INTERRUPTED OR INVALID RESULT'),
    ).toBe(true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
for (const fixtureId of ['order-lifecycle', 'inventory', 'workflow'] as const)
  test(`${fixtureId}: separately supplied redundant journey is actually reduced and never counted as autonomous discovery`, async () => {
    const b = await boundary(),
      r = await required(),
      suite = await b.selectSuite('required'),
      entry = suite.fixtures.find((e) => e.id === fixtureId)!,
      a = b
        .assignTrials(suite, 'SUPPLIED_REDUNDANCY')
        .find((a) => a.fixtureId === fixtureId)!;
    const identity = {
      provider: 'evaluator',
      model: 'supplied-journey',
    } as const;
    const result = await b.executeBenchmarkTrial(a, entry, {
      databaseUrl: process.env.TEST_DATABASE_URL!,
      identity,
      providerFor: (run) => ({
        identity,
        propose: async () => ({
          ...identity,
          proposal: r.evaluatorJourney(entry, run, true),
          usage: { estimated: true },
        }),
      }),
    });
    expect(result.discoveryStatus).toBe('NOT MEASURED');
    expect(result.confirmationStatus).toBe('CONFIRMED');
    expect(result.metrics.originalLength).toBe(4);
    expect(result.metrics.bestLength).toBe(3);
    expect(result.artifactStatus).toBe('VERIFIED');
    expect(b.summarizeBenchmark([result])).toEqual([]);
  });

test('CLI refuses a flag where the required output directory should be', async () => {
  const b = await boundary();
  await expect(
    b.benchmarkMain([
      '--approve-local-fixtures',
      '--output',
      '--redundant-only',
    ]),
  ).rejects.toThrow('USAGE');
});

test('freeze drift detected after the last trial invalidates the series without overwriting its trial records', async () => {
  const b = await boundary();
  let checks = 0;
  const records = await b.runBenchmark({
    suite: await b.selectSuite('required'),
    mode: 'AUTONOMOUS_DISCOVERY',
    assertFrozen: async () => {
      if (++checks === 31) throw Error('BUILD CHANGED');
    },
    execute: async (a) => b.emptyRecord(a, 'MODEL ERROR'),
  });
  expect(records).toHaveLength(30);
  expect(records.frozenIdentityUnchanged).toBe(false);
  expect(records.every((r) => r.stopReason === 'MODEL ERROR')).toBe(true);
});

// Post-Gate-5 attribution regression: no live provider or benchmark series.
test('planning usage retains provider-reported counts without relying on provider name', async () => {
  const b = await boundary();
  expect(
    b.planningTokenMetrics(
      {},
      {
        provider: 'gemini',
        usage: { inputTokens: 7, outputTokens: 9, estimated: false },
        proposal: {},
      },
    ),
  ).toEqual({
    input: { value: 7, source: 'PROVIDER' },
    output: { value: 9, source: 'PROVIDER' },
  });
});
test('planning usage respects estimates even for a Gemini identity', async () => {
  const b = await boundary();
  expect(
    b.planningTokenMetrics(
      {},
      {
        provider: 'gemini',
        usage: { inputTokens: 7, outputTokens: 9, estimated: true },
        proposal: {},
      },
    ),
  ).toEqual({
    input: { value: 7, source: 'ESTIMATED' },
    output: { value: 9, source: 'ESTIMATED' },
  });
});
test('failed Gemini telemetry preserves fallback input estimate and unavailable output', async () => {
  const b = await boundary();
  expect(
    b.planningTokenMetrics(
      {},
      {
        telemetry: {
          provider: 'gemini',
          outcome: 'MODEL ERROR',
          usage: { inputTokens: 17, estimated: true },
        },
      },
    ),
  ).toEqual({
    input: { value: 17, source: 'ESTIMATED' },
    output: { value: null, source: 'UNKNOWN' },
  });
});
test('missing token counts estimate only available sanitized bytes', async () => {
  const b = await boundary();
  const metrics = b.planningTokenMetrics({ text: 'é' }, undefined);
  expect(metrics.input).toEqual({
    value: Math.ceil(Buffer.byteLength(JSON.stringify({ text: 'é' })) / 4),
    source: 'ESTIMATED',
  });
  expect(metrics.output).toEqual({ value: null, source: 'UNKNOWN' });
});
test('mixed token attribution aggregates as estimated, never provider-only', async () => {
  const b = await boundary();
  expect(
    b.totalTokens([
      { value: 7, source: 'PROVIDER' },
      { value: 3, source: 'ESTIMATED' },
    ]),
  ).toEqual({ value: 10, source: 'ESTIMATED' });
});
test('unknown output remains unknown through aggregation', async () => {
  const b = await boundary();
  expect(
    b.totalTokens([
      { value: 7, source: 'PROVIDER' },
      { value: null, source: 'UNKNOWN' },
    ]),
  ).toEqual({ value: null, source: 'UNKNOWN' });
});
test('benchmark JSON roundtrip retains corrected sources and unknown values', async () => {
  const b = await boundary();
  const a = b.assignTrials(
    await b.selectSuite('required'),
    'AUTONOMOUS_DISCOVERY',
  )[0]!;
  const r = b.emptyRecord(a, 'MODEL ERROR');
  const tokens = b.planningTokenMetrics(
    {},
    {
      telemetry: {
        provider: 'gemini',
        usage: { inputTokens: 7, estimated: true },
      },
    },
  );
  r.metrics.inputTokens = tokens.input;
  r.metrics.outputTokens = tokens.output;
  const output = JSON.parse(
    JSON.stringify({
      records: [r],
      input: b.totalTokens([tokens.input]),
      output: b.totalTokens([tokens.output]),
    }),
  );
  expect(output.records[0].metrics.inputTokens).toEqual({
    value: 7,
    source: 'ESTIMATED',
  });
  expect(output.input).toEqual({ value: 7, source: 'ESTIMATED' });
  expect(output.output).toEqual({ value: null, source: 'UNKNOWN' });
});
test('supervised failed Gemini call reports estimated input in persisted benchmark results', async () => {
  const b = await boundary(),
    suite = await b.selectSuite('required'),
    entry = suite.fixtures[0]!,
    a = b.assignTrials(suite, 'AUTONOMOUS_DISCOVERY')[0]!;
  const { ProviderRequestError } =
    await import('../../src/engine/planning/provider');
  const identity = { provider: 'gemini', model: 'test-model' } as const;
  const r = await b.executeBenchmarkTrial(a, entry, {
    databaseUrl: process.env.TEST_DATABASE_URL!,
    identity,
    providerFor: () => ({
      identity,
      propose: async () => {
        throw new ProviderRequestError({
          model: identity.model,
          stage: 'REQUEST',
          httpStatus: 429,
          apiStatus: 'RESOURCE_EXHAUSTED',
        });
      },
    }),
  });
  expect(r.stopReason).toBe('MODEL ERROR');
  expect(r.metrics.modelCalls).toBe(1);
  expect(r.metrics.requests).toBe(0);
  expect(r.metrics.inputTokens.source).toBe('ESTIMATED');
  expect(r.metrics.inputTokens.value).toBeGreaterThan(0);
  expect(r.metrics.outputTokens).toEqual({ value: null, source: 'UNKNOWN' });
});

test('provider RPM is frozen and changes identity without changing the 30 assigned denominators', async () => {
  const b = await boundary(),
    suite = await b.selectSuite('required');
  const a = await b.freezeBenchmark(
    suite,
    identity,
    'AUTONOMOUS_DISCOVERY',
    12,
  );
  const slow = await b.freezeBenchmark(
    suite,
    identity,
    'AUTONOMOUS_DISCOVERY',
    6,
  );
  expect(a.configuration.modelPacing).toEqual({
    requestsPerMinute: 12,
    minimumDispatchSpacingMs: 5000,
  });
  expect(a.configurationHash).not.toBe(slow.configurationHash);
  expect(b.assignTrials(suite, 'AUTONOMOUS_DISCOVERY')).toHaveLength(30);
});
