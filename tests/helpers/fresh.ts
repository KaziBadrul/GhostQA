import type { RequestListener } from 'node:http';
import { CredentialStore } from '../../src/server/credential-store';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { Json, Run } from '../../src/engine/contracts';
import { isolatedDatabase } from './database';
import { targetServer } from './target-server';
import { makeRun } from './run';
import { migrate } from '../../src/server/migrate';
import { RunSupervisor } from '../../src/server/run-supervisor';
interface Options {
  resetStatus?: number;
  resetStatuses?: number[];
  baselineBody?: Json;
  delayMs?: number;
  itemStatus?: number;
  itemBody?: Json;
  onItem?: RequestListener;
  credential?: string;
  configure?: (run: Run) => void;
}
// A local mock server; it never contacts an external target.
export async function freshHarness(
  status = 200,
  requests = 200,
  options: Options = {},
) {
  const calls: string[] = [];
  let resets = 0;
  const target = await targetServer((q, r) => {
    calls.push(q.url ?? '');
    if (q.url !== '/api/reset' && q.url !== '/api/baseline' && options.onItem) {
      options.onItem(q, r);
      return;
    }
    const resetStatus =
      q.url === '/api/reset'
        ? (options.resetStatuses?.[resets++] ?? options.resetStatus ?? 200)
        : 200;
    const send = () =>
      r
        .writeHead(
          q.url === '/api/baseline'
            ? status
            : q.url === '/api/reset'
              ? resetStatus
              : (options.itemStatus ?? 200),
          {
            'content-type': 'application/json',
          },
        )
        .end(
          JSON.stringify(
            q.url === '/api/baseline'
              ? (options.baselineBody ?? {})
              : q.url === '/api/reset'
                ? { reset: true }
                : (options.itemBody ?? {}),
          ),
        );
    if (options.delayMs) setTimeout(send, options.delayMs);
    else send();
  });
  const db = await isolatedDatabase();
  let s: RunSupervisor | undefined;
  try {
    await migrate(db.client, resolve('migrations'));
    const project = randomUUID();
    await db.client.query('INSERT INTO projects(id,name) VALUES ($1,$2)', [
      project,
      'fresh',
    ]);
    const credentials =
      options.credential === undefined
        ? undefined
        : new CredentialStore(db.client, randomBytes(32));
    if (credentials)
      await credentials.replace(project, 'api', options.credential!);
    s = await RunSupervisor.acquire(db.client, credentials);
    const run = makeRun(project, target.port);
    run.budget.limits.requests = requests;
    if (credentials)
      run.credentialBindings = [
        {
          slot: 'api',
          version: 1,
          kind: 'bearer',
          location: 'header',
          name: 'Authorization',
        },
      ];
    options.configure?.(run);
    await s.accept(run);
    return {
      s,
      run,
      calls,
      client: db.client,
      async close() {
        await s!.shutdown();
        await db.close();
        await target.close();
      },
    };
  } catch (error) {
    await s?.shutdown();
    await db.close();
    await target.close();
    throw error;
  }
}
