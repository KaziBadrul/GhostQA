import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import {
  orderConfiguration,
  orderOperationPolicy,
} from '../../scripts/t035-configuration';
import {
  OperationPolicySchema,
  PredicateSchema,
  JourneySchema,
} from '../../src/engine/contracts';
import {
  predicateHash,
  evaluatePredicate,
} from '../../src/engine/detection/predicate';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import {
  authorizeOperation,
  approveScope,
} from '../../src/engine/policy/scope';
import { buildPlanningContext } from '../../src/engine/planning/context';
import { validateJourney } from '../../src/engine/validation/journey';
import { SecretVault } from '../../src/engine/secrets/vault';
import { makeRun } from '../helpers/run';
import { isolatedDatabase } from '../helpers/database';
import { migrate } from '../../src/server/migrate';
import { RunSupervisor } from '../../src/server/run-supervisor';
import { establishFreshState } from '../../src/engine/fresh-state/manager';
import { executeJourney } from '../../src/engine/execution/journey';

const suiteSchema = z.strictObject({
  formatVersion: z.literal(1),
  fixtures: z
    .array(
      z.strictObject({
        id: z.enum(['order-lifecycle', 'inventory', 'workflow']),
        module: z.string(),
        startExport: z.string(),
        openapi: z.string(),
        variants: z.strictObject({
          inconsistent: z.literal(false),
          repaired: z.literal(true),
        }),
        baseline: z.record(z.string(), z.number()),
        operationPolicy: OperationPolicySchema,
        invariant: z.strictObject({
          sourceRef: z.string(),
          applicability: z.array(z.json()),
          assertions: z.array(z.json()),
        }),
        evaluator: z.strictObject({
          priorStep: z.string(),
          laterStep: z.literal('later'),
          actions: z.array(z.string()),
          inconsistentState: z.string(),
          repairedState: z.string(),
        }),
      }),
    )
    .length(3),
});
async function suite() {
  return suiteSchema.parse(
    JSON.parse(await readFile('fixtures/private/required-suite.json', 'utf8')),
  );
}
const cases = [
  {
    id: 'inventory',
    collection: 'items',
    parameter: 'itemId',
    initial: 'AVAILABLE',
    prior: 'UNAVAILABLE',
    later: 'ALLOCATED',
    action: 'unavailable',
    finalAction: 'allocate',
    start: async (repaired: boolean) =>
      (await import('../../fixtures/api/inventory')).startInventoryFixture(
        repaired,
      ),
  },
  {
    id: 'workflow',
    collection: 'documents',
    parameter: 'documentId',
    initial: 'DRAFT',
    prior: 'ARCHIVED',
    later: 'PUBLISHED',
    action: 'archive',
    finalAction: 'publish',
    start: async (repaired: boolean) =>
      (await import('../../fixtures/api/workflow')).startWorkflowFixture(
        repaired,
      ),
  },
] as const;
type Scenario = (typeof cases)[number];
type Fixture = Awaited<ReturnType<Scenario['start']>>;
async function configuration(c: Scenario, fixture: Fixture) {
  const entry = (await suite()).fixtures.find((f) => f.id === c.id)!;
  const run = makeRun(randomUUID(), fixture.port);
  run.apiSnapshot = await parseOpenApi(JSON.stringify(fixture.openapi));
  run.scope = approveScope(
    fixture.url + '/api',
    [{ ip: '127.0.0.1', family: 4 }],
    entry.operationPolicy,
    true,
    randomUUID(),
  );
  const predicate = (
    sourceRef: string,
    applicability: unknown[],
    assertions: unknown[],
  ) =>
    PredicateSchema.parse({
      id: randomUUID(),
      version: 1,
      source: 'DEVELOPER',
      sourceRef,
      applicability,
      assertions,
      canonicalHash: predicateHash({ applicability, assertions }),
    });
  run.predicates = [
    predicate(
      entry.invariant.sourceRef,
      entry.invariant.applicability,
      entry.invariant.assertions,
    ),
  ];
  run.reset.resetSteps[0]!.operationId = 'POST /api/control/reset';
  run.reset.checkSteps[0]!.operationId = 'GET /api/control/baseline';
  run.reset.resetAssertions = [
    {
      id: randomUUID(),
      predicate: predicate(
        'reset acknowledgement',
        [],
        [
          {
            op: 'equals',
            left: { kind: 'json', stepId: 'reset', pointer: '/reset' },
            right: { kind: 'literal', value: true },
          },
        ],
      ),
    },
  ];
  run.reset.baselineAssertions = [
    {
      id: randomUUID(),
      predicate: predicate(
        'empty baseline',
        [],
        [
          {
            op: 'equals',
            left: { kind: 'json', stepId: 'read', pointer: '/' + c.collection },
            right: { kind: 'literal', value: 0 },
          },
        ],
      ),
    },
  ];
  const p = run.predicates[0]!;
  const journey = JourneySchema.parse({
    id: randomUUID(),
    predicateRef: { id: p.id, version: p.version, hash: p.canonicalHash },
    rationale: 'Evaluator-only fixture test, not discovery',
    variables: [],
    dependencies: [
      {
        producer: 'create',
        consumer: entry.evaluator.priorStep,
        variable: 'id',
      },
      { producer: 'create', consumer: 'later', variable: 'id' },
    ],
    steps: [
      {
        id: 'create',
        operationId: `POST /api/${c.collection}`,
        parameters: [],
        bodyBindings: [],
        extracts: [
          {
            name: 'id',
            expectedType: 'string',
            source: { kind: 'json', stepId: 'create', pointer: '/id' },
            sensitive: false,
          },
        ],
        expectedStatuses: [201],
      },
      ...[
        { id: entry.evaluator.priorStep, action: c.action },
        { id: 'later', action: c.finalAction },
      ].map((s) => ({
        id: s.id,
        operationId: `POST /api/${c.collection}/{${c.parameter}}/${s.action}`,
        parameters: [
          {
            location: 'path',
            name: c.parameter,
            value: { kind: 'variable', name: 'id' },
          },
        ],
        bodyBindings: [],
        extracts: [],
        expectedStatuses: [200, 409],
      })),
    ],
  });
  return { run, journey, entry };
}
// Evaluator-only requests outside any GhostQA run, as in T035 fixture unit integration.
async function call(url: string, path: string, method = 'GET') {
  const r = await fetch(url + path, { method });
  return {
    status: r.status,
    body: z.record(z.string(), z.json()).parse(await r.json()),
  };
}

test('required suite contains exactly three pairs, reusing unchanged T035 order configuration', async () => {
  const s = await suite();
  expect(s.fixtures.map((f) => f.id)).toEqual([
    'order-lifecycle',
    'inventory',
    'workflow',
  ]);
  expect(new Set(s.fixtures.map((f) => f.module)).size).toBe(3);
  const order = s.fixtures[0]!;
  expect(order.module).toBe('fixtures/api/order-lifecycle.ts');
  expect(order.startExport).toBe('startOrderFixture');
  expect(order.openapi).toBe('fixtures/openapi/order-lifecycle.json');
  expect(order.operationPolicy).toEqual(orderOperationPolicy());
  const f = await startOrderFixture(false);
  try {
    const c = await orderConfiguration(f.openapi, f.url, 'test-model');
    expect(order.invariant.applicability).toEqual(
      c.run.predicates[0]!.applicability,
    );
    expect(order.invariant.assertions).toEqual(c.run.predicates[0]!.assertions);
  } finally {
    await f.close();
  }
  expect(JSON.stringify(s)).not.toMatch(
    /shipment|reservation|account|password|supplemental/,
  );
});
for (const c of cases) {
  test(`${c.id}: identical neutral contracts and supported OpenAPI generation profile`, async () => {
    const a = await c.start(false),
      b = await c.start(true);
    try {
      expect(a.openapi).toEqual(b.openapi);
      expect((await call(a.url, '/openapi.json')).body).toEqual(a.openapi);
      expect((await call(b.url, '/openapi.json')).body).toEqual(b.openapi);
      expect(JSON.stringify(a.openapi)).not.toMatch(
        /faulty|repaired|inconsistent|trigger|evaluator|expectedJourney|\$ref|https?:/i,
      );
      const configured = await configuration(c, a);
      expect(configured.entry.module).toBe(`fixtures/api/${c.id}.ts`);
      expect(configured.entry.openapi).toBe(`fixtures/openapi/${c.id}.json`);
      expect(configured.entry.startExport).toBe(
        c.id === 'inventory' ? 'startInventoryFixture' : 'startWorkflowFixture',
      );
      expect(configured.entry.evaluator.actions).toEqual(
        configured.journey.steps.map((step) => step.operationId),
      );
      const api = await parseOpenApi(JSON.stringify(a.openapi));
      expect(api.operations).toHaveLength(6);
      expect(api.operations.every((o) => o.eligible)).toBe(true);
      expect(new Set(api.operations.map((o) => o.id))).toEqual(
        new Set(
          (await configuration(c, a)).entry.operationPolicy.map(
            (p) => p.operationId,
          ),
        ),
      );
    } finally {
      await a.close();
      await b.close();
    }
  });
  test(`${c.id}: planner excludes controls and private evaluator data; deterministic policy rejects forged authority`, async () => {
    const f = await c.start(false);
    try {
      const { run, journey, entry } = await configuration(c, f);
      run.modelConfiguration = {
        model: 'test-model',
        fixtureMetadata: entry.evaluator,
        variant: 'PRIVATE VARIANT SENTINEL',
      };
      run.apiSnapshot.importDiagnostics.push({
        private: 'PRIVATE TRIGGER SENTINEL',
        evaluator: entry.evaluator,
      });
      const vault = new SecretVault();
      const context = buildPlanningContext(
        {
          run,
          mappings: [],
          observations: [],
          symbolicInputs: {},
          consideredHypothesisHashes: [],
        },
        vault,
      );
      expect(context.api.operations).toHaveLength(4);
      expect(
        context.api.operations.every((o) => !o.id.includes('/control/')),
      ).toBe(true);
      expect(JSON.stringify(context)).not.toMatch(
        /control\/|PRIVATE|fixtureMetadata|inconsistentState|repairedState|"actions"|faulty|repaired|evaluator/,
      );
      expect(JSON.stringify(context)).not.toContain(
        JSON.stringify(entry.evaluator.actions),
      );
      expect(entry.baseline).toEqual({ [c.collection]: 0 });
      expect(context.approvedPredicateRefs[0]!.hash).toBe(
        run.predicates[0]!.canonicalHash,
      );
      expect(
        validateJourney(journey, run.apiSnapshot, run.scope, 'EXPLORATION'),
      ).toEqual(journey);
      for (const phase of [
        'EXPLORATION',
        'REPLAY',
        'MINIMIZATION',
        'ARTIFACT',
      ] as const) {
        for (const control of [
          'POST /api/control/reset',
          'GET /api/control/baseline',
        ])
          expect(() => authorizeOperation(run.scope, control, phase)).toThrow(
            'OPERATION FORBIDDEN',
          );
        for (const o of context.api.operations)
          expect(() =>
            authorizeOperation(run.scope, o.id, phase),
          ).not.toThrow();
      }
      expect(() =>
        authorizeOperation(run.scope, 'POST /api/control/reset', 'RESET'),
      ).not.toThrow();
      expect(() =>
        authorizeOperation(run.scope, 'GET /api/control/baseline', 'BASELINE'),
      ).not.toThrow();
      expect(() =>
        authorizeOperation(run.scope, 'POST /api/control/reset', 'BASELINE'),
      ).toThrow();
      expect(() =>
        authorizeOperation(run.scope, 'GET /api/control/baseline', 'RESET'),
      ).toThrow();
      for (const control of [
        'POST /api/control/reset',
        'GET /api/control/baseline',
      ]) {
        const hallucinated = structuredClone(journey);
        hallucinated.steps[0]!.operationId = control;
        expect(() =>
          validateJourney(
            hallucinated,
            run.apiSnapshot,
            run.scope,
            'EXPLORATION',
          ),
        ).toThrow();
        expect(() =>
          validateJourney(
            { ...hallucinated, phase: 'RESET' },
            run.apiSnapshot,
            run.scope,
            'EXPLORATION',
          ),
        ).toThrow();
      }
      const excluded = structuredClone(run.scope);
      const id = context.api.operations[0]!.id;
      excluded.operationPolicy.find((p) => p.operationId === id)!.category =
        'EXCLUDED';
      excluded.operationPolicy.find((p) => p.operationId === id)!.phases = [];
      expect(() => authorizeOperation(excluded, id, 'EXPLORATION')).toThrow();
      vault.discard();
    } finally {
      await f.close();
    }
  });
  test(`${c.id}: supervisor rejects control and forged phase intents without target budget consumption`, async () => {
    const fixture = await c.start(false);
    const db = await isolatedDatabase();
    let supervisor: RunSupervisor | undefined;
    try {
      await migrate(db.client, resolve('migrations'));
      const { run, journey } = await configuration(c, fixture);
      await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
        run.projectId,
        'control exclusion',
      ]);
      supervisor = await RunSupervisor.acquire(db.client);
      await supervisor.accept(run);
      const trial = await establishFreshState(
        supervisor,
        run,
        journey,
        'EXPLORATION',
        {},
      );
      const usedBefore = supervisor.snapshot.budget.usedRequests;
      const controlIntent = {
        kind: 'EXECUTE',
        runId: run.id,
        trialId: trial.id,
        stepId: 'create',
        operationId: 'POST /api/control/reset',
        input: { path: {}, query: {}, headers: {} },
      };
      await expect(
        supervisor.dispatchIntent({ ...controlIntent, phase: 'RESET' }),
      ).rejects.toThrow();
      await expect(supervisor.dispatchIntent(controlIntent)).rejects.toThrow();
      expect(supervisor.snapshot.budget.usedRequests).toBe(usedBefore);
      expect(usedBefore).toBe(2);
      expect(
        (
          await db.client.query(
            'SELECT count(*)::int AS count FROM step_records WHERE run_id=$1',
            [run.id],
          )
        ).rows[0].count,
      ).toBe(2);
      // A rejected dispatch ends that attempted step; never resume a malformed journey.
    } finally {
      await supervisor?.shutdown();
      await db.close();
      await fixture.close();
    }
  });
  for (const repaired of [false, true]) {
    test(`${c.id}: deterministic reset, ordinary valid transition and guarded transition repaired=${repaired}`, async () => {
      const f = await c.start(repaired);
      try {
        for (let i = 0; i < 2; i++) {
          expect(
            (await call(f.url, '/api/control/reset', 'POST')).body,
          ).toEqual({ reset: true });
          expect((await call(f.url, '/api/control/baseline')).body).toEqual({
            [c.collection]: 0,
          });
        }
        const created = await call(f.url, `/api/${c.collection}`, 'POST');
        expect(created.status).toBe(201);
        const id = z.uuid().parse(created.body.id);
        expect(created.body.state).toBe(c.initial);
        expect((await call(f.url, `/api/${c.collection}/${id}`)).body).toEqual(
          created.body,
        );
        expect(
          (await call(f.url, `/api/${c.collection}/${id}/${c.action}`, 'POST'))
            .body,
        ).toEqual({ id, state: c.prior });
        const later = await call(
          f.url,
          `/api/${c.collection}/${id}/${c.finalAction}`,
          'POST',
        );
        expect(later.status).toBe(repaired ? 409 : 200);
        expect(later.body).toEqual({ id, state: repaired ? c.prior : c.later });
        expect((await call(f.url, `/api/${c.collection}/${id}`)).body).toEqual(
          later.body,
        );
        await call(f.url, '/api/control/reset', 'POST');
        expect((await call(f.url, '/api/control/baseline')).body).toEqual({
          [c.collection]: 0,
        });
        expect((await call(f.url, `/api/${c.collection}/${id}`)).status).toBe(
          404,
        );
        const next = await call(f.url, `/api/${c.collection}`, 'POST');
        expect(next.body.id).not.toBe(id);
        expect(
          (
            await call(
              f.url,
              `/api/${c.collection}/${next.body.id}/${c.finalAction}`,
              'POST',
            )
          ).body.state,
        ).toBe(c.later);
        expect(
          (
            await call(
              f.url,
              `/api/${c.collection}/${next.body.id}/${c.action}`,
              'POST',
            )
          ).status,
        ).toBe(409);
      } finally {
        await f.close();
      }
    });
    test(`${c.id}: supervised fresh trials, generic predicate and shared accounting repaired=${repaired}`, async () => {
      const f = await c.start(repaired),
        db = await isolatedDatabase();
      let supervisor: RunSupervisor | undefined;
      try {
        await migrate(db.client, resolve('migrations'));
        const { run, journey } = await configuration(c, f);
        await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
          run.projectId,
          'required fixture',
        ]);
        supervisor = await RunSupervisor.acquire(db.client);
        await supervisor.accept(run);
        const ids: string[] = [],
          baselines: string[] = [],
          trials: string[] = [];
        for (const phase of ['EXPLORATION', 'REPLAY'] as const) {
          const trial = await establishFreshState(
            supervisor,
            run,
            journey,
            phase,
            {},
          );
          expect(trial.baseline.verdict).toBe('SATISFIED');
          await executeJourney(supervisor, run, journey, trial);
          expect(evaluatePredicate(run.predicates[0]!, trial.values)).toBe(
            repaired ? 'SATISFIED' : 'VIOLATED',
          );
          ids.push(String(trial.values.vault.get('id')));
          baselines.push(trial.baseline.id);
          trials.push(trial.id);
          const last = trial.values.results.get('later')!;
          const original = last.body;
          last.body = { id: 'other', state: c.later };
          expect(evaluatePredicate(run.predicates[0]!, trial.values)).toBe(
            'NOT APPLICABLE',
          );
          last.body = original;
          const ordinal = last.ordinal;
          last.ordinal = -1;
          expect(evaluatePredicate(run.predicates[0]!, trial.values)).toBe(
            'NOT APPLICABLE',
          );
          last.ordinal = ordinal;
          trial.values.results.delete('later');
          expect(evaluatePredicate(run.predicates[0]!, trial.values)).toBe(
            'UNEVALUABLE',
          );
          supervisor.finishTrial();
        }
        for (const values of [ids, baselines, trials])
          expect(new Set(values).size).toBe(2);
        const counters = (
          await db.client.query('SELECT counters FROM runs WHERE id=$1', [
            run.id,
          ])
        ).rows[0].counters;
        expect(counters.usedRequests).toBe(10);
        expect(counters.requestsByPhase).toMatchObject({
          RESET: 2,
          BASELINE: 2,
          EXPLORATION: 3,
          REPLAY: 3,
        });
      } finally {
        await supervisor?.shutdown();
        await db.close();
        await f.close();
      }
    });
  }
}

// Fixture servers serve test data; only existing supervised engine dispatch owns requests.
test('private suite has no engine import path and new fixtures add no outbound dispatcher', async () => {
  async function files(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(directory + '/' + entry.name)
          : Promise.resolve([directory + '/' + entry.name]),
      ),
    );
    return nested.flat().filter((file) => file.endsWith('.ts'));
  }
  for (const file of await files('src/engine'))
    expect(await readFile(file, 'utf8'), file).not.toMatch(
      /required-suite|fixtures\/private/,
    );
  for (const c of cases) {
    const source = await readFile('fixtures/api/' + c.id + '.ts', 'utf8');
    expect(source).not.toMatch(
      /fetch\s*\(|http-executor|RunSupervisor|BudgetManager|node:https|\.request\s*\(|fixtures\/private|from ['"][^'"]*private/,
    );
    expect(source).toContain("from 'node:http'");
    expect(source).toContain('createServer');
  }
});
