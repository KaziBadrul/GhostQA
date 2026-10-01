import { expect, test } from 'vitest';
import { makeJourney } from '../helpers/journey';
import { freshHarness } from '../helpers/fresh';
import { establishFreshState } from '../../src/engine/fresh-state/manager';
import { executeJourney } from '../../src/engine/execution/journey';
import { validateJourney } from '../../src/engine/validation/journey';
import { makeRun } from '../helpers/run';
import { randomUUID } from 'node:crypto';
test('journey validation rejects controls, unknown operations and forged phase', () => {
  const run = makeRun(randomUUID());
  for (const operation of [
    'POST /api/reset',
    'GET /api/baseline',
    'GET /invented',
  ])
    expect(() =>
      validateJourney(
        makeJourney(operation),
        run.apiSnapshot,
        run.scope,
        'EXPLORATION',
      ),
    ).toThrow();
  expect(() =>
    validateJourney(
      { ...makeJourney(), phase: 'RESET' },
      run.apiSnapshot,
      run.scope,
      'EXPLORATION',
    ),
  ).toThrow();
});
test('unknown parameters cannot reach dispatcher', () => {
  const run = makeRun(randomUUID());
  const j = makeJourney();
  j.steps[0]!.parameters = [
    { location: 'query', name: 'madeUp', value: { kind: 'literal', value: 1 } },
  ];
  expect(() =>
    validateJourney(j, run.apiSnapshot, run.scope, 'EXPLORATION'),
  ).toThrow('UNKNOWN PARAMETER');
});
test('sequential execution records sanitized result and consumes same budget', async () => {
  const h = await freshHarness();
  try {
    const j = makeJourney();
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    const results = await executeJourney(h.s, h.run, j, trial);
    expect(results[0]?.status).toBe(200);
    expect(h.calls).toEqual(['/api/reset', '/api/baseline', '/api/item']);
  } finally {
    await h.close();
  }
});
test('missing runtime binding fails before dependent request', async () => {
  const h = await freshHarness();
  try {
    const j = makeJourney();
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    j.steps[0]!.parameters = [
      {
        location: 'query',
        name: 'id',
        value: { kind: 'variable', name: 'missing' },
      },
    ];
    await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow();
    expect(h.calls).toEqual(['/api/reset', '/api/baseline']);
  } finally {
    await h.close();
  }
});

for (const status of [401, 403])
  test(`declared ${status} remains application evidence`, async () => {
    const h = await freshHarness(200, 200, { itemStatus: status });
    try {
      const j = makeJourney();
      j.steps[0]!.expectedStatuses = [status, 200];
      const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
      expect((await executeJourney(h.s, h.run, j, trial))[0]!.status).toBe(
        status,
      );
    } finally {
      await h.close();
    }
  });
for (const status of [401, 403, 429])
  test(`unexpected auth/rate limit ${status} stops scheduling`, async () => {
    const h = await freshHarness(200, 200, { itemStatus: status });
    try {
      const j = makeJourney();
      j.steps.push({ ...j.steps[0]!, id: 'later' });
      const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
      await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow(
        'EXECUTION ERROR',
      );
      expect(h.calls).toHaveLength(3);
      expect(
        (await h.client.query('SELECT status,stop_reason FROM runs')).rows[0],
      ).toEqual({ status: 'STOPPED', stop_reason: 'EXECUTION ERROR' });
    } finally {
      await h.close();
    }
  });
test('static credential is injected and an explicitly bound journey header overrides it only for that step', async () => {
  const seen: string[] = [];
  const h = await freshHarness(200, 200, {
    credential: 'configured-private-bearer',
    onItem: (q, r) => {
      seen.push(q.headers.authorization ?? '');
      r.writeHead(200, { 'content-type': 'application/json' }).end('{}');
    },
    configure: (run) => {
      run.apiSnapshot.operations.find(
        (o) => o.id === 'GET /api/item',
      )!.parameters = [
        {
          name: 'Authorization',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          style: 'simple',
          explode: false,
          sensitive: true,
        },
      ];
    },
  });
  try {
    const j = makeJourney();
    j.steps[0]!.parameters = [
      {
        location: 'header',
        name: 'Authorization',
        value: { kind: 'variable', name: 'auth' },
      },
    ];
    j.variables = [
      {
        name: 'auth',
        expectedType: 'string',
        source: { kind: 'input', key: 'auth' },
        sensitive: true,
      },
    ];
    j.steps.push({ ...j.steps[0]!, id: 'static', parameters: [] });
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {
      auth: 'Bearer trial-private-token',
    });
    await executeJourney(h.s, h.run, j, trial);
    expect(seen).toEqual([
      'Bearer trial-private-token',
      'Bearer configured-private-bearer',
    ]);
    const persisted = JSON.stringify(
      (
        await h.client.query(
          'SELECT sanitized_request,sanitized_response FROM step_records',
        )
      ).rows,
    );
    expect(persisted).not.toContain('configured-private-bearer');
    expect(persisted).not.toContain('trial-private-token');
  } finally {
    await h.close();
  }
});
test('literal schema-invalid parameters are rejected before reset', () => {
  const run = makeRun(randomUUID());
  run.apiSnapshot.operations.find((o) => o.id === 'GET /api/item')!.parameters =
    [
      {
        name: 'count',
        in: 'query',
        required: true,
        schema: { type: 'integer', minimum: 1 },
        style: 'form',
        explode: true,
        sensitive: false,
      },
    ];
  const j = makeJourney();
  j.steps[0]!.parameters = [
    {
      location: 'query',
      name: 'count',
      value: { kind: 'literal', value: 'wrong' },
    },
  ];
  expect(() =>
    validateJourney(j, run.apiSnapshot, run.scope, 'EXPLORATION'),
  ).toThrow('INVALID PARAMETER');
});
test('excluded operation is denied independently of planner filtering', () => {
  const run = makeRun(randomUUID());
  run.scope.operationPolicy.find(
    (p) => p.operationId === 'GET /api/item',
  )!.category = 'EXCLUDED';
  run.scope.operationPolicy.find(
    (p) => p.operationId === 'GET /api/item',
  )!.phases = [];
  expect(() =>
    validateJourney(makeJourney(), run.apiSnapshot, run.scope, 'EXPLORATION'),
  ).toThrow('OPERATION FORBIDDEN');
});
test('cancellation after fresh state prevents journey dispatch and preserves cancellation reason', async () => {
  const h = await freshHarness();
  try {
    const j = makeJourney();
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    h.s.cancel();
    await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow(
      'CANCELLED',
    );
    expect(h.calls).toHaveLength(2);
  } finally {
    await h.close();
  }
});
test('intent storage failure prevents journey socket dispatch', async () => {
  const h = await freshHarness();
  try {
    const j = makeJourney();
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    h.s.repository.intent = async () => {
      throw new Error('database unavailable');
    };
    await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow();
    expect(h.calls).toHaveLength(2);
  } finally {
    await h.close();
  }
});
test('ambiguous mutating request is charged once and never retried', async () => {
  let mutations = 0;
  const h = await freshHarness(200, 200, {
    onItem: (q) => {
      mutations++;
      q.socket.destroy();
    },
    configure: (run) => {
      const op = run.apiSnapshot.operations.find(
        (o) => o.id === 'GET /api/item',
      )!;
      op.id = 'POST /api/item';
      op.method = 'POST';
      const policy = run.scope.operationPolicy.find(
        (p) => p.operationId === 'GET /api/item',
      )!;
      policy.operationId = op.id;
      run.scope.operationIds = run.scope.operationPolicy.map(
        (p) => p.operationId,
      );
    },
  });
  try {
    const j = makeJourney('POST /api/item');
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow(
      'EXECUTION ERROR',
    );
    expect(mutations).toBe(1);
    expect(
      (await h.client.query('SELECT counters FROM runs')).rows[0].counters
        .usedRequests,
    ).toBe(3);
  } finally {
    await h.close();
  }
});
test('typed header primitives validate before serialization', async () => {
  let header = '';
  const h = await freshHarness(200, 200, {
    onItem: (q, r) => {
      header = String(q.headers['x-count']);
      r.writeHead(200, { 'content-type': 'application/json' }).end('{}');
    },
    configure: (run) => {
      run.apiSnapshot.operations.find(
        (o) => o.id === 'GET /api/item',
      )!.parameters = [
        {
          name: 'X-Count',
          in: 'header',
          required: true,
          schema: { type: 'integer', minimum: 1 },
          style: 'simple',
          explode: false,
          sensitive: false,
        },
      ];
    },
  });
  try {
    const j = makeJourney();
    j.steps[0]!.parameters = [
      {
        location: 'header',
        name: 'X-Count',
        value: { kind: 'literal', value: 3 },
      },
    ];
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    await executeJourney(h.s, h.run, j, trial);
    expect(header).toBe('3');
  } finally {
    await h.close();
  }
});
test('dependent values are extracted fresh and encoded into a later request', async () => {
  const h = await freshHarness(200, 200, {
    itemBody: { id: 'local-issued-id' },
    configure: (run) => {
      run.apiSnapshot.operations.find(
        (o) => o.id === 'GET /api/item',
      )!.parameters = [
        {
          name: 'id',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          style: 'form',
          explode: true,
          sensitive: false,
        },
      ];
    },
  });
  try {
    const j = makeJourney();
    j.steps[0]!.extracts = [
      {
        name: 'id',
        expectedType: 'string',
        source: { kind: 'json', stepId: 'inspect', pointer: '/id' },
        sensitive: false,
      },
    ];
    j.steps.push({
      ...j.steps[0]!,
      id: 'use',
      extracts: [],
      parameters: [
        {
          location: 'query',
          name: 'id',
          value: { kind: 'variable', name: 'id' },
        },
      ],
    });
    j.dependencies = [{ producer: 'inspect', consumer: 'use', variable: 'id' }];
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    expect(await executeJourney(h.s, h.run, j, trial)).toHaveLength(2);
    expect(h.calls[3]).toBe('/api/item?id=local-issued-id');
  } finally {
    await h.close();
  }
});
test('schema is revalidated after response substitution before consuming a dependent request', async () => {
  const h = await freshHarness(200, 200, {
    itemBody: { count: 9 },
    configure: (run) => {
      run.apiSnapshot.operations.find(
        (o) => o.id === 'GET /api/item',
      )!.parameters = [
        {
          name: 'count',
          in: 'query',
          required: false,
          schema: { type: 'integer', maximum: 3 },
          style: 'form',
          explode: true,
          sensitive: false,
        },
      ];
    },
  });
  try {
    const j = makeJourney();
    j.steps[0]!.extracts = [
      {
        name: 'count',
        expectedType: 'integer',
        source: { kind: 'json', stepId: 'inspect', pointer: '/count' },
        sensitive: false,
      },
    ];
    j.steps.push({
      ...j.steps[0]!,
      id: 'use',
      extracts: [],
      parameters: [
        {
          location: 'query',
          name: 'count',
          value: { kind: 'variable', name: 'count' },
        },
      ],
    });
    j.dependencies = [
      { producer: 'inspect', consumer: 'use', variable: 'count' },
    ];
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow(
      'EXECUTION ERROR',
    );
    expect(h.calls).toHaveLength(3);
    expect(
      (await h.client.query('SELECT counters FROM runs')).rows[0].counters
        .usedRequests,
    ).toBe(3);
  } finally {
    await h.close();
  }
});
test('oversized substituted body is rejected before budget consumption or socket dispatch', async () => {
  const h = await freshHarness(200, 200, {
    configure: (run) => {
      run.apiSnapshot.operations.find(
        (o) => o.id === 'GET /api/item',
      )!.requestBody = { type: 'string' };
    },
  });
  try {
    const j = makeJourney();
    j.steps[0]!.body = null;
    j.steps[0]!.bodyBindings = [
      { pointer: '', value: { kind: 'variable', name: 'body' } },
    ];
    j.variables = [
      {
        name: 'body',
        expectedType: 'string',
        source: { kind: 'input', key: 'body' },
        sensitive: false,
      },
    ];
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {
      body: 'x'.repeat(1048576),
    });
    await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow(
      'EXECUTION ERROR',
    );
    expect(h.calls).toHaveLength(2);
    expect(
      (await h.client.query('SELECT counters FROM runs')).rows[0].counters
        .usedRequests,
    ).toBe(2);
  } finally {
    await h.close();
  }
});
test('declared target 429 still stops and cannot become ordinary application evidence', async () => {
  const h = await freshHarness(200, 200, { itemStatus: 429 });
  try {
    const j = makeJourney();
    j.steps[0]!.expectedStatuses = [429];
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow(
      'EXECUTION ERROR',
    );
  } finally {
    await h.close();
  }
});
test('editing admitted response expectations cannot bypass authentication stopping', async () => {
  const h = await freshHarness(200, 200, { itemStatus: 403 });
  try {
    const j = makeJourney();
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    j.steps[0]!.expectedStatuses.push(403);
    await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow(
      'EXECUTION ERROR',
    );
    expect(h.calls).toHaveLength(2);
  } finally {
    await h.close();
  }
});
test('shutdown disables dispatch, aborts an in-flight request, and clears trial secrets', async () => {
  let ready = () => {};
  const reached = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const h = await freshHarness(200, 200, {
    onItem: () => {
      ready();
    },
  });
  try {
    const j = makeJourney();
    j.variables = [
      {
        name: 'secret',
        expectedType: 'string',
        source: { kind: 'input', key: 'secret' },
        sensitive: true,
      },
    ];
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {
      secret: 'temporary-private-value',
    });
    const execution = executeJourney(h.s, h.run, j, trial);
    const rejection = expect(execution).rejects.toThrow();
    await reached;
    await h.s.shutdown();
    await rejection;
    expect(h.calls).toHaveLength(3);
    expect(() => trial.values.vault.get('secret')).toThrow('VAULT CLOSED');
    expect(
      (await h.client.query('SELECT counters,status FROM runs')).rows[0],
    ).toMatchObject({ status: 'INTERRUPTED', counters: { usedRequests: 3 } });
  } finally {
    await h.close();
  }
});
test('authoritative dispatch itself rejects unexpected authentication without relying on journey wrapper', async () => {
  const h = await freshHarness(200, 200, { itemStatus: 403 });
  try {
    const j = makeJourney();
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    await expect(
      h.s.dispatchIntent({
        kind: 'EXECUTE',
        runId: h.run.id,
        trialId: trial.id,
        stepId: 'inspect',
        operationId: 'GET /api/item',
        input: { path: {}, query: {}, headers: {} },
      }),
    ).rejects.toThrow('EXECUTION ERROR');
    expect(
      (
        await h.client.query(
          "SELECT outcome,error_reason FROM step_records WHERE step_name='inspect'",
        )
      ).rows[0],
    ).toEqual({
      outcome: 'EXECUTION ERROR',
      error_reason: 'AUTHENTICATION REJECTION',
    });
    expect(() => h.s.assertAuthority()).toThrow('EXECUTION ERROR');
  } finally {
    await h.close();
  }
});
