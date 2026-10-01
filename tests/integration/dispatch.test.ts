import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { isolatedDatabase } from '../helpers/database';
import { targetServer } from '../helpers/target-server';
import { makeRun } from '../helpers/run';
import { migrate } from '../../src/server/migrate';
import { RunSupervisor } from '../../src/server/run-supervisor';
import type { Journey } from '../../src/engine/contracts';
async function harness() {
  let calls = 0;
  const target = await targetServer((_q, r) => {
    calls++;
    r.setHeader('content-type', 'application/json');
    r.end('{}');
  });
  const db = await isolatedDatabase();
  await migrate(db.client, resolve('migrations'));
  const project = randomUUID();
  await db.client.query('INSERT INTO projects(id,name) VALUES ($1,$2)', [
    project,
    'dispatch',
  ]);
  const s = await RunSupervisor.acquire(db.client);
  const run = await s.accept(makeRun(project, target.port));
  const journey: Journey = {
    id: randomUUID(),
    steps: [
      {
        ...run.reset.checkSteps[0]!,
        id: 'inspect',
        operationId: 'GET /api/item',
      },
    ],
    variables: [],
    dependencies: [],
    predicateRef: {
      id: run.predicates[0]!.id,
      version: 1,
      hash: run.predicates[0]!.canonicalHash,
    },
    rationale: '',
  };
  const trial = s.admitTrial(journey, 'EXPLORATION');
  return {
    target,
    db,
    s,
    run,
    trial,
    journey,
    calls: () => calls,
    intent: (stepId: string, operationId: string) => ({
      kind: 'EXECUTE',
      runId: run.id,
      trialId: trial,
      stepId,
      operationId,
      input: { path: {}, query: {}, headers: {} },
    }),
    async close() {
      await s.shutdown();
      await db.close();
      await target.close();
    },
  };
}
test('durable intent precedes socket; reset and baseline phase derive from supervisor', async () => {
  const h = await harness();
  try {
    const original = h.s.repository.intent.bind(h.s.repository);
    h.s.repository.intent = async (...args) => {
      expect(h.calls()).toBe(args[1].usedRequests - 1);
      await original(...args);
      expect(
        (
          await h.db.client.query(
            'SELECT count(*)::int AS count FROM step_records',
          )
        ).rows[0].count,
      ).toBe(args[1].usedRequests);
    };
    await h.s.dispatchIntent(h.intent('reset', 'POST /api/reset'));
    await h.s.dispatchIntent(h.intent('read', 'GET /api/baseline'));
    await h.s.establishBaseline();
    await h.s.dispatchIntent(h.intent('inspect', 'GET /api/item'));
    expect(h.calls()).toBe(3);
    expect(
      (
        await h.db.client.query(
          'SELECT phase FROM step_records ORDER BY ordinal',
        )
      ).rows.map((x) => x.phase),
    ).toEqual(['RESET', 'BASELINE', 'EXPLORATION']);
  } finally {
    await h.close();
  }
});
test('cancel after durable intent forbids socket and retains conservative charge', async () => {
  const h = await harness();
  try {
    const original = h.s.repository.intent.bind(h.s.repository);
    h.s.repository.intent = async (...args) => {
      await original(...args);
      h.s.cancel();
    };
    await expect(
      h.s.dispatchIntent(h.intent('reset', 'POST /api/reset')),
    ).rejects.toThrow('CANCELLED');
    expect(h.calls()).toBe(0);
    expect(
      (await h.db.client.query('SELECT counters FROM runs')).rows[0].counters
        .usedRequests,
    ).toBe(1);
    expect(
      (await h.db.client.query('SELECT outcome FROM step_records')).rows[0]
        .outcome,
    ).toBe('INTENT');
    await expect(
      h.s.dispatchIntent(h.intent('reset', 'POST /api/reset')),
    ).rejects.toThrow('CANCELLED');
  } finally {
    await h.close();
  }
});
test('storage failure forbids dispatch', async () => {
  const h = await harness();
  try {
    h.s.repository.intent = async () => {
      throw new Error('storage unavailable');
    };
    await expect(
      h.s.dispatchIntent(h.intent('reset', 'POST /api/reset')),
    ).rejects.toThrow('STORAGE ERROR');
    expect(h.calls()).toBe(0);
  } finally {
    await h.close();
  }
});
test('forged phase field cannot authorize any dispatch', async () => {
  const h = await harness();
  try {
    await expect(
      h.s.dispatchIntent({
        ...h.intent('reset', 'POST /api/reset'),
        phase: 'RESET',
      }),
    ).rejects.toThrow();
    expect(h.calls()).toBe(0);
  } finally {
    await h.close();
  }
});
test('control proposed for exploration is rejected by authoritative policy', async () => {
  const h = await harness();
  try {
    await h.s.dispatchIntent(h.intent('reset', 'POST /api/reset'));
    await h.s.dispatchIntent(h.intent('read', 'GET /api/baseline'));
    await h.s.establishBaseline();
    await expect(
      h.s.dispatchIntent(h.intent('inspect', 'POST /api/reset')),
    ).rejects.toThrow('INTENT MISMATCH');
    expect(h.calls()).toBe(2);
  } finally {
    await h.close();
  }
});
test('concurrent intent cannot create a second dispatch', async () => {
  const h = await harness();
  try {
    const original = h.s.repository.intent.bind(h.s.repository);
    let entered = () => {},
      release = () => {};
    const ready = new Promise<void>((r) => (entered = r)),
      barrier = new Promise<void>((r) => (release = r));
    h.s.repository.intent = async (...args) => {
      await original(...args);
      entered();
      await barrier;
    };
    const first = h.s.dispatchIntent(h.intent('reset', 'POST /api/reset'));
    await ready;
    await expect(
      h.s.dispatchIntent(h.intent('reset', 'POST /api/reset')),
    ).rejects.toThrow('DISPATCH BUSY');
    release();
    await first;
    expect(h.calls()).toBe(1);
  } finally {
    await h.close();
  }
});
