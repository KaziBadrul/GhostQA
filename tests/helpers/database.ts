import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../src/server/db';

export async function isolatedDatabase() {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error('TEST_DATABASE_URL required');
  const db = createDatabase(process.env.TEST_DATABASE_URL);
  const client = await db.connect();
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}"`);
  return {
    client,
    async close() {
      await client.query(`DROP SCHEMA "${schema}" CASCADE`);
      client.release();
      await db.end();
    },
  };
}
