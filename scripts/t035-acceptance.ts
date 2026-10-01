import { writeFile } from 'node:fs/promises';
import { startOrderFixture } from '../fixtures/api/order-lifecycle';
import { orderConfiguration } from './t035-configuration';
import { main } from '../src/cli/vertical-slice';
import { loadLocalEnvironment, readConfig } from '../src/server/config';
import { createDatabase } from '../src/server/db';

// Acceptance orchestration only: all target execution remains in the CLI's
// supervised dispatcher. No evaluator-private data is passed to the planner.
loadLocalEnvironment();
const environment = readConfig(process.env);
const fixture = await startOrderFixture(false);
const configuration = await orderConfiguration(
  fixture.openapi,
  fixture.url,
  environment.geminiModel,
);
const pool = createDatabase(environment.databaseUrl);
const file = `/private/tmp/ghostqa-t035-${configuration.run.id}.json`;
try {
  await pool.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
    configuration.run.projectId,
    'T035 controlled order-lifecycle acceptance',
  ]);
  await writeFile(file, JSON.stringify(configuration, null, 2));
  console.log(JSON.stringify({ runId: configuration.run.id }));
  await main([file, '--approve-scope']);
  const evidence: Record<string, unknown> = {};
  for (const table of [
    'runs',
    'journeys',
    'step_records',
    'observations',
    'evidence',
    'findings',
  ]) {
    // Table names are fixed above; run identity remains parameterized.
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE ${table === 'runs' ? 'id' : 'run_id'}=$1`,
      [configuration.run.id],
    );
    evidence[table] = result.rows;
  }
  evidence.finding_transitions = (
    await pool.query(
      'SELECT t.* FROM finding_transitions t JOIN findings f ON f.id=t.finding_id WHERE f.run_id=$1',
      [configuration.run.id],
    )
  ).rows;
  await writeFile(
    '/private/tmp/ghostqa-t035-evidence.json',
    JSON.stringify(evidence, null, 2),
  );
  console.log('Sanitized database evidence saved for acceptance review');
  const candidate = await pool.query(
    "SELECT id FROM findings WHERE run_id=$1 AND current_classification='OBSERVED VIOLATION'",
    [configuration.run.id],
  );
  if (candidate.rowCount === 0) throw new Error('T035 GATE 2 NOT PASSED');
} finally {
  await pool.end();
  await fixture.close();
}
