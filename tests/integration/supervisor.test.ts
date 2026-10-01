import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { isolatedDatabase } from '../helpers/database';
import { migrate } from '../../src/server/migrate';
import { makeRun } from '../helpers/run';
import { RunSupervisor } from '../../src/server/run-supervisor';

test('advisory ownership is exclusive and cancellation closes authority permanently', async () => {
  const a = await isolatedDatabase(),
    b = await isolatedDatabase();
  try {
    await migrate(a.client, resolve('migrations'));
    await migrate(b.client, resolve('migrations'));
    const first = await RunSupervisor.acquire(a.client);
    await expect(RunSupervisor.acquire(b.client)).rejects.toThrow(
      'SUPERVISOR BUSY',
    );
    first.cancel();
    expect(() => first.assertAuthority()).toThrow('CANCELLED');
    await first.shutdown();
    const second = await RunSupervisor.acquire(b.client);
    await second.shutdown();
  } finally {
    await a.close();
    await b.close();
  }
});
test('restart records INTERRUPTED without replaying uncertain intents or refunding counters', async () => {
  const db = await isolatedDatabase();
  const project = randomUUID(),
    run = randomUUID();
  try {
    await migrate(db.client, resolve('migrations'));
    await db.client.query('INSERT INTO projects(id,name) VALUES ($1,$2)', [
      project,
      'interrupted',
    ]);
    await db.client.query(
      "INSERT INTO runs(id,project_id,status,immutable_snapshot,counters) VALUES ($1,$2,'RUNNING','{}',$3)",
      [run, project, { usedRequests: 1 }],
    );
    await db.client.query(
      'INSERT INTO step_records(id,run_id,trial_id,step_name,phase,ordinal,sanitized_request) VALUES ($1,$2,$3,$4,$5,0,$6)',
      [randomUUID(), run, randomUUID(), 'change', 'EXPLORATION', {}],
    );
    const supervisor = await RunSupervisor.acquire(db.client);
    expect(
      (
        await db.client.query('SELECT status,counters FROM runs WHERE id=$1', [
          run,
        ])
      ).rows[0],
    ).toEqual({ status: 'INTERRUPTED', counters: { usedRequests: 1 } });
    expect(
      (await db.client.query('SELECT outcome FROM step_records')).rows[0],
    ).toEqual({ outcome: 'INTENT' });
    await supervisor.shutdown();
  } finally {
    await db.close();
  }
});
test('lock connection loss closes dispatch gate synchronously', async () => {
  const db = await isolatedDatabase();
  try {
    await migrate(db.client, resolve('migrations'));
    const s = await RunSupervisor.acquire(db.client);
    db.client.emit('error', new Error('connection lost'));
    expect(() => s.assertAuthority()).toThrow('OWNERSHIP LOST');
    await s.shutdown();
  } finally {
    await db.close();
  }
});

test('cancellation during awaited acceptance persistence cannot activate a worker/run', async () => {
  const db = await isolatedDatabase();
  try {
    await migrate(db.client, resolve('migrations'));
    const project = randomUUID();
    await db.client.query('INSERT INTO projects(id,name) VALUES ($1,$2)', [
      project,
      'cancel',
    ]);
    const s = await RunSupervisor.acquire(db.client);
    const original = s.repository.create.bind(s.repository);
    let release = () => {};
    let entered = () => {};
    const barrier = new Promise<void>((r) => {
      release = r;
    });
    const ready = new Promise<void>((r) => {
      entered = r;
    });
    s.repository.create = async (run) => {
      await original(run);
      entered();
      await barrier;
    };
    const pending = s.accept(makeRun(project));
    await ready;
    s.cancel();
    release();
    await expect(pending).rejects.toThrow();
    expect(s.signal.aborted).toBe(true);
    expect(() => s.assertAuthority()).toThrow('CANCELLED');
    await s.shutdown();
  } finally {
    await db.close();
  }
});
test('parent deadline closes authority and stops its supervised worker', async () => {
  const db = await isolatedDatabase();
  try {
    await migrate(db.client, resolve('migrations'));
    const project = randomUUID();
    await db.client.query('INSERT INTO projects(id,name) VALUES ($1,$2)', [
      project,
      'deadline',
    ]);
    const s = await RunSupervisor.acquire(db.client);
    const run = makeRun(project);
    run.budget.limits.milliseconds = 100;
    await s.accept(run);
    await new Promise((r) => setTimeout(r, 150));
    expect(() => s.assertAuthority()).toThrow('TIME EXHAUSTED');
    expect(s.signal.aborted).toBe(true);
    await s.shutdown();
  } finally {
    await db.close();
  }
});
