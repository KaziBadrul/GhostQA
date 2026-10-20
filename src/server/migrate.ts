import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';
import { createDatabase } from './db';
import { databaseConnectionString, loadLocalEnvironment } from './config';

export async function migrate(client: PoolClient, folder: string) {
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, hash text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const files = (await readdir(folder))
    .filter((name) => /^\d{3}_[a-z0-9_-]+\.sql$/.test(name))
    .sort();
  for (const name of files) {
    const sql = await readFile(join(folder, name), 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');
    await client.query('BEGIN');
    try {
      await client.query('LOCK TABLE schema_migrations IN EXCLUSIVE MODE');
      const previous = await client.query<{ hash: string }>(
        'SELECT hash FROM schema_migrations WHERE name=$1',
        [name],
      );
      if (previous.rows[0]) {
        if (previous.rows[0].hash !== hash)
          throw new Error('Changed applied migration');
      } else {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations(name,hash) VALUES ($1,$2)',
          [name, hash],
        );
      }
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK');
      throw new Error('Migration failed');
    }
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  loadLocalEnvironment();
  const db = createDatabase(databaseConnectionString(process.env));
  const client = await db.connect();
  try {
    await migrate(client, resolve('migrations'));
  } finally {
    client.release();
    await db.end();
  }
}
