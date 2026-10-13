import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ApplicationController } from '../../src/server/application-engine';
import { migrate } from '../../src/server/migrate';
import { exampleReset, exampleInvariant } from '../../src/lib/setup-example';
import { createDatabase } from '../../src/server/db';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import {
  ProviderRequestError,
  ProviderOutputError,
  type ReasoningProvider,
} from '../../src/engine/planning/provider';
import { JourneySchema } from '../../src/engine/contracts';
let controller: ApplicationController;
let pool: pg.Pool;
let admin: pg.Pool;
let schema: string;
const config = {
  databaseUrl: 'unused',
  credentialKey: Buffer.alloc(32, 7),
  geminiModel: 'test-model',
  geminiApiKey: 'test-key',
  geminiRequestsPerMinute: 12,
  hostname: '127.0.0.1' as const,
  limits: {
    requests: 200,
    milliseconds: 600000,
    journeys: 20,
    steps: 10,
    requestTimeoutMs: 10000,
    modelTimeoutMs: 30000,
  },
} as const;
const identity = { provider: 'gemini', model: 'test-model' };
let provider: ReasoningProvider;
beforeEach(async () => {
  if (!process.env.TEST_DATABASE_URL) throw Error('TEST_DATABASE_URL required');
  admin = createDatabase(process.env.TEST_DATABASE_URL);
  schema = 'app_' + randomUUID().replaceAll('-', '');
  await admin.query(`CREATE SCHEMA "${schema}"`);
  pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    options: `-c search_path=${schema}`,
    max: 6,
  });
  const client = await pool.connect();
  try {
    await migrate(client, resolve('migrations'));
  } finally {
    client.release();
  }
  provider = {
    identity,
    propose: async () => {
      throw Error('No test proposal');
    },
  };
  controller = new ApplicationController(
    pool,
    config,
    () => provider,
    async () => {},
  );
});
afterEach(async () => {
  await controller?.shutdown();
  if (schema) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
  await admin?.end();
});
async function create() {
  const result = (await controller.command('create', undefined, {
    name: 'Orders',
    targetTemplate: {},
  })) as { project: { id: string } };
  return result.project.id;
}
async function configured(target = 'http://127.0.0.1:4010/api') {
  const id = await create();
  await controller.command(
    'import',
    id,
    await readFile('examples/orders.openapi.json', 'utf8'),
  );
  await controller.command('edit', id, { targetUrl: target });
  await controller.command('reset', id, exampleReset);
  const result = (await controller.command(
    'predicate',
    id,
    exampleInvariant,
  )) as { predicate: { id: string; version: number; canonicalHash: string } };
  const p = result.predicate;
  await controller.command(
    'approve',
    id,
    { id: p.id, version: p.version, hash: p.canonicalHash },
    p.id,
  );
  return id;
}
test('projects, imported contracts and encrypted credential versions reopen without secret disclosure', async () => {
  const id = await create();
  await controller.command(
    'import',
    id,
    await readFile('examples/orders.openapi.json', 'utf8'),
  );
  await controller.command(
    'credential',
    id,
    { value: 'secret-value-abc-123', kind: 'bearer', name: 'Authorization' },
    'auth',
  );
  const detail = await controller.command('get', id);
  expect(JSON.stringify(detail)).not.toContain('secret-value-abc-123');
  const rows = await pool.query(
    'SELECT ciphertext,nonce,auth_tag FROM credentials WHERE project_id=$1',
    [id],
  );
  expect(rows.rowCount).toBe(1);
  expect(JSON.stringify(rows.rows)).not.toContain('secret-value-abc-123');
  await expect(
    controller.command('edit', id, {
      targetUrl: 'http://user:pass@localhost/api',
    }),
  ).rejects.toThrow();
  await expect(
    controller.command('predicate', id, {
      ...exampleInvariant,
      sourceRef: 'secret-value-abc-123',
    }),
  ).rejects.toThrow('SECRET IN CONFIGURATION');
  expect(
    ((await controller.command('list')) as { projects: unknown[] }).projects,
  ).toHaveLength(1);
  await controller.command('delete', id, { confirmed: true });
  expect((await pool.query('SELECT * FROM credentials')).rowCount).toBe(0);
});
test('missing approval, stale configuration, reset/exploration conflicts prevent run admission', async () => {
  const id = await configured();
  const preview = (await controller.command('preview', id, {})) as {
    previewId: string;
    approvalHash: string;
    scope: { operationPolicy: { operationId: string; category: string }[] };
  };
  expect(
    preview.scope.operationPolicy.find(
      (p) => p.operationId === 'POST /api/control/reset',
    )?.category,
  ).toBe('RESET');
  await controller.command('edit', id, { exclusions: ['POST /api/orders'] });
  await expect(
    controller.command('start', id, {
      previewId: preview.previewId,
      approvalHash: preview.approvalHash,
      mutationsAcknowledged: true,
    }),
  ).rejects.toThrow('STALE PREVIEW');
  await controller.command('edit', id, {
    exclusions: ['POST /api/control/reset'],
  });
  await expect(controller.command('preview', id, {})).rejects.toThrow(
    'INVALID SETUP',
  );
  await controller.command('edit', id, { exclusions: [] });
  const next = (await controller.command('preview', id, {})) as {
    previewId: string;
    approvalHash: string;
  };
  await pool.query(
    "UPDATE projects SET target_template=target_template-'predicateApprovalId' WHERE id=$1",
    [id],
  );
  await expect(
    controller.command('start', id, {
      previewId: next.previewId,
      approvalHash: next.approvalHash,
      mutationsAcknowledged: true,
    }),
  ).rejects.toThrow('SETUP REQUIRED');
  expect((await pool.query('SELECT * FROM step_records')).rowCount).toBe(0);
});
test('configured project executes, independently confirms, verifies and exports through supervised dispatch', async () => {
  const fixture = await startOrderFixture(false);
  try {
    const id = await configured(fixture.url + '/api');
    provider = {
      identity,
      propose: async (context) => {
        const ref = context.approvedPredicateRefs[0]!;
        return {
          ...identity,
          usage: { estimated: true },
          proposal: JourneySchema.parse({
            id: randomUUID(),
            variables: [],
            predicateRef: ref,
            rationale:
              'Supplied integration journey; not autonomous discovery evidence',
            dependencies: [
              {
                producer: 'create',
                consumer: 'cancelled',
                variable: 'orderId',
              },
              { producer: 'create', consumer: 'later', variable: 'orderId' },
            ],
            steps: [
              {
                id: 'create',
                operationId: 'POST /api/orders',
                parameters: [],
                bodyBindings: [],
                extracts: [
                  {
                    name: 'orderId',
                    expectedType: 'string',
                    source: { kind: 'json', stepId: 'create', pointer: '/id' },
                    sensitive: false,
                  },
                ],
                expectedStatuses: [201],
              },
              {
                id: 'cancelled',
                operationId: 'POST /api/orders/{orderId}/cancel',
                parameters: [
                  {
                    location: 'path',
                    name: 'orderId',
                    value: { kind: 'variable', name: 'orderId' },
                  },
                ],
                bodyBindings: [],
                extracts: [],
                expectedStatuses: [200],
              },
              {
                id: 'later',
                operationId: 'POST /api/orders/{orderId}/fulfill',
                parameters: [
                  {
                    location: 'path',
                    name: 'orderId',
                    value: { kind: 'variable', name: 'orderId' },
                  },
                ],
                bodyBindings: [],
                extracts: [],
                expectedStatuses: [200, 409],
              },
            ],
          }),
        };
      },
    };
    const preview = (await controller.command('preview', id, {})) as {
      previewId: string;
      approvalHash: string;
    };
    const started = (await controller.command('start', id, {
      previewId: preview.previewId,
      approvalHash: preview.approvalHash,
      mutationsAcknowledged: true,
    })) as { run: { id: string } };
    let run:
      | {
          state: string;
          outcome: string;
          reportAvailable: boolean;
          finding?: { artifactStatus: string };
        }
      | undefined;
    for (let i = 0; i < 200; i++) {
      run = (
        (await controller.command('run', started.run.id)) as { run: typeof run }
      ).run;
      if (run?.state === 'SUCCEEDED' || run?.state === 'FAILED') break;
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(run?.state).toBe('SUCCEEDED');
    expect(run?.outcome).toBe('VIOLATION CONFIRMED');
    expect(run?.finding?.artifactStatus).toBe('VERIFIED');
    expect(
      (
        (await controller.command('export', started.run.id)) as {
          bundle: { code: string };
        }
      ).bundle.code,
    ).toContain('runStandalone');
    const phases = await pool.query('SELECT DISTINCT phase FROM step_records');
    expect(phases.rows.map((r) => r.phase)).toEqual(
      expect.arrayContaining([
        'RESET',
        'BASELINE',
        'EXPLORATION',
        'REPLAY',
        'ARTIFACT',
      ]),
    );
  } finally {
    await fixture.close();
  }
}, 20000);
test('cancellation closes the supervisor gate while planning; active project deletion is rejected', async () => {
  const fixture = await startOrderFixture(false);
  try {
    const id = await configured(fixture.url + '/api');
    provider = {
      identity,
      propose: async (_, signal) =>
        new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(Error('CANCELLED')), {
            once: true,
          }),
        ),
    };
    const preview = (await controller.command('preview', id, {})) as {
      previewId: string;
      approvalHash: string;
    };
    const started = (await controller.command('start', id, {
      previewId: preview.previewId,
      approvalHash: preview.approvalHash,
      mutationsAcknowledged: true,
    })) as { run: { id: string } };
    await expect(
      controller.command('delete', id, { confirmed: true }),
    ).rejects.toThrow('ANOTHER RUN IN PROGRESS');
    expect(await controller.command('cancel', started.run.id, {})).toEqual({
      state: 'STOPPING',
      dispatchDisabled: true,
    });
    await new Promise((r) => setTimeout(r, 100));
    expect((await pool.query('SELECT * FROM step_records')).rowCount).toBe(0);
  } finally {
    await fixture.close();
  }
}, 15000);

test('expired scope previews prevent dispatch and interrupted presentation is recovered without replay', async () => {
  const id = await configured();
  const preview = (await controller.command('preview', id, {})) as {
    previewId: string;
    approvalHash: string;
  };
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);
  try {
    await expect(
      controller.command('start', id, {
        previewId: preview.previewId,
        approvalHash: preview.approvalHash,
        mutationsAcknowledged: true,
      }),
    ).rejects.toThrow('STALE PREVIEW');
  } finally {
    clock.mockRestore();
  }
  const runId = randomUUID();
  await pool.query(
    'INSERT INTO application_runs(id,project_id,presentation) VALUES($1,$2,$3)',
    [
      runId,
      id,
      {
        id: runId,
        projectId: id,
        fixtureId: 'custom',
        mode: 'LIVE',
        state: 'QUEUED',
        stage: 'QUEUED',
        outcome: 'PENDING',
        startedAt: new Date().toISOString(),
        finishedAt: null,
        counters: null,
        stopReason: null,
        finding: null,
        failure: null,
        reportAvailable: false,
      },
    ],
  );
  await controller.recover();
  const result = (await controller.command('run', runId)) as {
    run: { state: string; outcome: string; stopReason: string };
  };
  expect(result.run).toMatchObject({
    state: 'FAILED',
    outcome: 'NOT EVALUABLE',
    stopReason: 'INTERRUPTED',
  });
  expect((await pool.query('SELECT * FROM step_records')).rowCount).toBe(0);
});

test.each([
  [
    new ProviderRequestError({
      stage: 'REQUEST',
      model: 'test-model',
      httpStatus: 429,
      apiStatus: 'RESOURCE_EXHAUSTED',
    }),
    'MODEL QUOTA EXHAUSTED',
  ],
  [
    new ProviderRequestError({
      stage: 'REQUEST',
      model: 'test-model',
      httpStatus: 400,
      apiStatus: 'INVALID_ARGUMENT',
    }),
    'MODEL REQUEST REJECTED',
  ],
  [
    new ProviderOutputError({
      stage: 'CONTRACT_VALIDATION',
      model: 'test-model',
      contractIssues: [{ code: 'invalid_format', path: ['mappings', 0, 'id'] }],
    }),
    'MODEL INVALID OUTPUT',
  ],
])(
  'custom runs persist actionable planning failure %s as %s without target dispatch',
  async (error, code) => {
    const id = await configured();
    provider = {
      identity,
      propose: async () => {
        throw error;
      },
    };
    const preview = (await controller.command('preview', id, {})) as {
      previewId: string;
      approvalHash: string;
    };
    const started = (await controller.command('start', id, {
      previewId: preview.previewId,
      approvalHash: preview.approvalHash,
      mutationsAcknowledged: true,
    })) as { run: { id: string } };
    let run:
      | {
          state: string;
          outcome: string;
          failure: { code: string; detail: string };
        }
      | undefined;
    for (let i = 0; i < 200; i++) {
      run = (
        (await controller.command('run', started.run.id)) as { run: typeof run }
      ).run;
      if (run?.state === 'FAILED') break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(run).toMatchObject({
      state: 'FAILED',
      outcome: 'NOT EVALUABLE',
      failure: { code },
    });
    expect(run?.failure.detail).not.toContain('test-key');
    expect((await pool.query('SELECT * FROM step_records')).rowCount).toBe(0);
  },
);
