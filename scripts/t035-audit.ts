import { readFile, writeFile } from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { loadLocalEnvironment, readConfig } from '../src/server/config';
import { createDatabase } from '../src/server/db';

// Read-only acceptance audit. No target transport or dispatch authority.
loadLocalEnvironment();
const config = readConfig(process.env);
const file = '/private/tmp/ghostqa-t035-evidence.json';
const evidence = JSON.parse(await readFile(file, 'utf8')) as Record<
  string,
  unknown
> & { runs: { id: string }[] };
const pool = createDatabase(config.databaseUrl);
try {
  const runId = evidence.runs[0]!.id;
  evidence.observations = (
    await pool.query('SELECT * FROM observations WHERE run_id=$1', [runId])
  ).rows;
  evidence.finding_transitions = (
    await pool.query(
      'SELECT t.* FROM finding_transitions t JOIN findings f ON f.id=t.finding_id WHERE f.run_id=$1',
      [runId],
    )
  ).rows;
  const sdk = new GoogleGenAI({
    apiKey: config.geminiApiKey,
    httpOptions: { timeout: 10000, retryOptions: { attempts: 1 } },
  });
  const model = await sdk.models.get({ model: config.geminiModel });
  evidence.modelLookup = {
    name: model.name,
    version: model.version,
    recordedAt: new Date().toISOString(),
  };
  await writeFile(file, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify({
      runId,
      model: model.name,
      version: model.version,
      audit: 'SAVED',
    }),
  );
} finally {
  await pool.end();
}
