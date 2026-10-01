import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createDatabase } from '../../src/server/db';
import { migrate } from '../../src/server/migrate';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error('TEST_DATABASE_URL required for database integration tests');

test('numbered migrations run in order, are idempotent and failures roll back', async () => {
  const db = createDatabase(url);
  const client = await db.connect();
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const folder = await mkdtemp(join(tmpdir(), 'ghostqa-migrations-'));
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await writeFile(
      join(folder, '002_second.sql'),
      'INSERT INTO sample VALUES (2);',
    );
    await writeFile(
      join(folder, '001_first.sql'),
      'CREATE TABLE sample (value integer); INSERT INTO sample VALUES (1);',
    );
    await migrate(client, folder);
    await migrate(client, folder);
    expect(
      (await client.query('SELECT value FROM sample ORDER BY value')).rows,
    ).toEqual([{ value: 1 }, { value: 2 }]);
    await writeFile(
      join(folder, '003_invalid.sql'),
      'INSERT INTO sample VALUES (3); SELECT unavailable_column FROM sample;',
    );
    await expect(migrate(client, folder)).rejects.toThrow('Migration failed');
    expect(
      (await client.query('SELECT count(*)::int AS count FROM sample')).rows[0],
    ).toEqual({ count: 2 });
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS count FROM schema_migrations',
        )
      ).rows[0],
    ).toEqual({ count: 2 });
  } finally {
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    client.release();
    await db.end();
    await rm(folder, { recursive: true });
  }
});

test('unreachable PostgreSQL fails with a finite connection timeout', async () => {
  const db = createDatabase('postgresql://127.0.0.1:1/ghostqa');
  try {
    await expect(db.query('SELECT 1')).rejects.toThrow();
  } finally {
    await db.end();
  }
});
