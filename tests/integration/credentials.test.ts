import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { isolatedDatabase } from '../helpers/database';
import { migrate } from '../../src/server/migrate';
import { CredentialStore } from '../../src/server/credential-store';
test('credentials persist ciphertext, version on replacement and cascade on deletion', async () => {
  const db = await isolatedDatabase(),
    project = randomUUID(),
    key = Buffer.alloc(32, 4);
  try {
    await migrate(db.client, resolve('migrations'));
    await db.client.query('INSERT INTO projects(id,name) VALUES ($1,$2)', [
      project,
      'credentials',
    ]);
    const store = new CredentialStore(db.client, key);
    const first = await store.replace(project, 'bearer', 'raw-secret-one');
    expect(first).toEqual({ slot: 'bearer', version: 1 });
    await store.replace(project, 'bearer', 'raw-secret-two');
    expect(
      await store.resolve({ projectId: project, slot: 'bearer', version: 1 }),
    ).toBe('raw-secret-one');
    const rows = await db.client.query('SELECT * FROM credentials');
    expect(JSON.stringify(rows.rows)).not.toContain('raw-secret');
    expect(rows.rowCount).toBe(2);
    await expect(
      new CredentialStore(db.client, Buffer.alloc(32, 5)).resolve({
        projectId: project,
        slot: 'bearer',
        version: 1,
      }),
    ).rejects.toThrow(/^CREDENTIAL UNAVAILABLE$/);
    await db.client.query('DELETE FROM projects WHERE id=$1', [project]);
    expect(
      (await db.client.query('SELECT count(*)::int AS count FROM credentials'))
        .rows[0],
    ).toEqual({ count: 0 });
  } finally {
    await db.close();
  }
});
