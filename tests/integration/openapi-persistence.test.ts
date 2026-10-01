import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { isolatedDatabase } from '../helpers/database';
import { makeRun } from '../helpers/run';
import { migrate } from '../../src/server/migrate';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import { saveSpecification } from '../../src/server/repositories/specifications';
import { SecretVault } from '../../src/engine/secrets/vault';
import { validInput } from '../../src/engine/openapi/schemas';
import { RunSupervisor } from '../../src/server/run-supervisor';
import type { ApiModel, Json } from '../../src/engine/contracts';
test('sanitized immutable specification preserves credential field schemas and actual reference constraints', async () => {
  const db = await isolatedDatabase();
  try {
    await migrate(db.client, resolve('migrations'));
    const project = randomUUID();
    await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      project,
      'import',
    ]);
    const doc: Json = {
      openapi: '3.1.0',
      info: { title: 'Neutral', version: '1' },
      components: { schemas: { Name: { type: 'string', maxLength: 8 } } },
      paths: {
        '/api/items': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      password: {
                        type: 'string',
                        default: 'planted-import-secret',
                      },
                      token: { type: 'string' },
                      name: {
                        $ref: '#/components/schemas/Name',
                        maxLength: 20,
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Result',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        echo: {
                          type: 'string',
                          example: 'planted-import-secret',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const model = await parseOpenApi(JSON.stringify(doc));
    expect(model.operations[0]!.eligible).toBe(true);
    const vault = new SecretVault();
    await saveSpecification(db.client, project, model, doc, vault);
    const row = (
      await db.client.query(
        'SELECT sanitized_document,api_model FROM specifications',
      )
    ).rows[0];
    expect(JSON.stringify(row)).not.toContain('planted-import-secret');
    expect(JSON.stringify(row)).toContain('[SECRET_');
    const saved = row.api_model as ApiModel;
    expect(
      validInput(saved.operations[0]!.requestBody!, {
        password: 'runtime-secret',
        token: 'runtime-token',
        name: '12345678',
      }),
    ).toBe(true);
    expect(
      validInput(saved.operations[0]!.requestBody!, {
        password: 'runtime-secret',
        token: 'runtime-token',
        name: '123456789',
      }),
    ).toBe(false);
    await expect(
      db.client.query("UPDATE specifications SET sanitized_document='{}'"),
    ).rejects.toThrow('Immutable record');
  } finally {
    await db.close();
  }
});
test('zero eligible exploration operations prevents durable run acceptance', async () => {
  const db = await isolatedDatabase();
  let supervisor: RunSupervisor | undefined;
  try {
    await migrate(db.client, resolve('migrations'));
    const project = randomUUID();
    await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      project,
      'blocked',
    ]);
    supervisor = await RunSupervisor.acquire(db.client);
    const run = makeRun(project);
    run.apiSnapshot.operations.forEach((o) => (o.eligible = false));
    await expect(supervisor.accept(run)).rejects.toThrow(
      'NO ELIGIBLE OPERATIONS',
    );
    expect(
      (await db.client.query('SELECT count(*)::int AS count FROM runs')).rows[0]
        .count,
    ).toBe(0);
  } finally {
    await supervisor?.shutdown();
    await db.close();
  }
});
test('run acceptance preserves schema field names instead of treating them as credential values', async () => {
  const db = await isolatedDatabase();
  let supervisor: RunSupervisor | undefined;
  try {
    await migrate(db.client, resolve('migrations'));
    const project = randomUUID();
    await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      project,
      'schema snapshot',
    ]);
    const doc: Json = {
      openapi: '3.1.0',
      info: { title: 'Neutral', version: '1' },
      paths: {
        '/api/reset': {
          post: { responses: { '200': { description: 'Result' } } },
        },
        '/api/baseline': {
          get: { responses: { '200': { description: 'Result' } } },
        },
        '/api/item': {
          get: {
            responses: {
              '200': {
                description: 'Result',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        token: { type: 'string' },
                        password: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const run = makeRun(project);
    run.apiSnapshot = await parseOpenApi(JSON.stringify(doc));
    supervisor = await RunSupervisor.acquire(db.client);
    await expect(supervisor.accept(run)).resolves.toMatchObject({
      status: 'ACCEPTED',
    });
    const snapshot = (
      await db.client.query('SELECT immutable_snapshot FROM runs')
    ).rows[0].immutable_snapshot;
    expect(JSON.stringify(snapshot)).toContain('"token":{"type":"string"}');
  } finally {
    await supervisor?.shutdown();
    await db.close();
  }
});
