import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { startOrderFixture } from '../fixtures/api/order-lifecycle';
import { orderConfiguration } from './t035-configuration';
import { main } from '../src/cli/vertical-slice';
import { loadLocalEnvironment, readConfig } from '../src/server/config';
import { createDatabase } from '../src/server/db';
import { migrate } from '../src/server/migrate';
import {
  loadFinding,
  loadFindingJourney,
  loadFindingRun,
  loadTrialEvidence,
} from '../src/server/repositories/findings';
import { validateVerification } from '../src/engine/detection/findings';

// Evaluator-owned order fixture. Planning receives only its neutral public
// contract and developer predicate. Every target request is made by the CLI's
// existing supervised dispatcher; this script has no target transport.
loadLocalEnvironment();
const environment = readConfig(process.env);
const fixture = await startOrderFixture(false);
const configuration = await orderConfiguration(
  fixture.openapi,
  fixture.url,
  environment.geminiModel,
);
const pool = createDatabase(environment.databaseUrl);
const client = await pool.connect();
const historical = await readFile(
  resolve('tests/acceptance/vertical-slice-order-passed.json'),
);
const file = `/private/tmp/ghostqa-t037-${configuration.run.id}.json`;
const snapshot: Record<string, unknown> = {};
try {
  await migrate(client, resolve('migrations'));
  await client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
    configuration.run.projectId,
    'T037 controlled order-lifecycle confirmation',
  ]);
  await writeFile(file, JSON.stringify(configuration, null, 2));
  console.log(
    JSON.stringify({ runId: configuration.run.id, acceptance: 'T037 GATE 3' }),
  );
  let failure: unknown;
  try {
    await main([file, '--approve-scope', '--verify']);
  } catch (error) {
    failure = error;
  }
  for (const table of [
    'runs',
    'journeys',
    'step_records',
    'observations',
    'evidence',
    'findings',
  ]) {
    // Fixed identifiers, parameterized run identity, sanitized persisted data.
    snapshot[table] = (
      await client.query(
        `SELECT * FROM ${table} WHERE ${table === 'runs' ? 'id' : 'run_id'}=$1`,
        [configuration.run.id],
      )
    ).rows;
  }
  snapshot.finding_transitions = (
    await client.query(
      'SELECT t.* FROM finding_transitions t JOIN findings f ON f.id=t.finding_id WHERE f.run_id=$1 ORDER BY t.created_at,t.id',
      [configuration.run.id],
    )
  ).rows;
  if (failure) {
    const allowed = [
      'SUPERVISOR BUSY',
      'SCOPE APPROVAL REQUIRED',
      'PROJECT REQUIRED',
      'SECRET IN RUN SNAPSHOT',
      'MODEL ERROR',
      'MODEL PLAN ERROR',
      'BASELINE ERROR',
      'EXECUTION ERROR',
      'STORAGE ERROR',
      'CANCELLED',
      'BUDGET EXHAUSTED',
      'TIME EXHAUSTED',
    ];
    snapshot.failureDiagnostic = {
      stage: 'LIVE RUN',
      code:
        failure instanceof Error && allowed.includes(failure.message)
          ? failure.message
          : 'LIVE RUN ERROR',
    };
  }
  await writeFile(
    `/private/tmp/ghostqa-t037-${configuration.run.id}-evidence.json`,
    JSON.stringify(snapshot, null, 2),
  );
  if (failure)
    throw new Error('T037 LIVE RUN FAILED; INSPECT SANITIZED EVIDENCE');
  const rows = await client.query<{ id: string }>(
    "SELECT id FROM findings WHERE run_id=$1 AND current_classification='CONFIRMED' AND consistent",
    [configuration.run.id],
  );
  if (rows.rowCount !== 1) throw new Error('T037 GATE 3 NOT PASSED');
  const { finding } = await loadFinding(
    client,
    configuration.run.projectId,
    rows.rows[0]!.id,
  );
  const run = await loadFindingRun(
    client,
    configuration.run.id,
    configuration.run.projectId,
  );
  const journey = await loadFindingJourney(client, run, finding);
  const initial = await loadTrialEvidence(
    client,
    run,
    finding.initialEvidenceId,
    'EXPLORATION',
    journey,
  );
  const replay = await loadTrialEvidence(
    client,
    run,
    finding.replayEvidenceIds[0]!,
    'REPLAY',
    journey,
  );
  validateVerification({
    run,
    finding: { ...finding, replayEvidenceIds: [] },
    predicate: run.predicates[0]!,
    initial,
    replay,
    initialApprovals: new Set(),
    replayApprovals: new Set(),
    specificationAssertions: new Map(),
  });
  if (
    initial.evidence.outcome !== 'VIOLATED' ||
    replay.evidence.outcome !== 'VIOLATED' ||
    run.budget.modelCalls < 1 ||
    run.budget.requestsByPhase.REPLAY !== journey.steps.length
  )
    throw new Error('T037 ACCEPTANCE EVIDENCE INVALID');
  const plans = await client.query<{ evaluation: unknown }>(
    "SELECT evaluation FROM evidence WHERE run_id=$1 AND kind='PLANNING RESULT'",
    [run.id],
  );
  const generated = plans.rows.some(
    (row) =>
      z
        .object({
          provider: z.literal('gemini'),
          model: z.literal(environment.geminiModel),
        })
        .safeParse(row.evaluation).success,
  );
  if (!generated) throw new Error('REAL GEMINI PLANNING EVIDENCE REQUIRED');
  const retained = await readFile(
    resolve('tests/acceptance/vertical-slice-order-passed.json'),
  );
  if (!historical.equals(retained))
    throw new Error('T035 HISTORICAL EVIDENCE CHANGED');
  snapshot.acceptance = {
    task: 'T037',
    result: 'GATE 3 PASS',
    runId: run.id,
    findingId: finding.id,
    model: environment.geminiModel,
    predicateRef: finding.predicateRef,
    initialEvidenceId: initial.evidence.id,
    initialTrialId: initial.evidence.trialId,
    initialBaselineId: initial.baseline.id,
    replayEvidenceId: replay.evidence.id,
    replayTrialId: replay.evidence.trialId,
    replayBaselineId: replay.baseline.id,
    usedRequests: run.budget.usedRequests,
    modelCalls: run.budget.modelCalls,
  };
  await writeFile(
    `/private/tmp/ghostqa-t037-${run.id}-evidence.json`,
    JSON.stringify(snapshot, null, 2),
  );
  console.log(JSON.stringify(snapshot.acceptance));
} catch (error) {
  // Allowlisted classifications and stored evidence only; no raw SDK/SQL error.
  console.error(
    JSON.stringify({
      task: 'T037',
      result: 'FAIL',
      runId: configuration.run.id,
      reason:
        error instanceof Error && error.message.startsWith('T037 ')
          ? error.message
          : 'ACCEPTANCE ERROR',
    }),
  );
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
  await fixture.close();
}
