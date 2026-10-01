import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startOrderFixture } from '../fixtures/api/order-lifecycle';
import { orderConfiguration } from './t035-configuration';
import { isolatedDatabase } from '../tests/helpers/database';
import { migrate } from '../src/server/migrate';
import { loadLocalEnvironment, readConfig } from '../src/server/config';
import { createGeminiProvider } from '../src/engine/planning/gemini';
import { runVerticalSlice } from '../src/cli/vertical-slice';
import { canonical } from '../src/engine/detection/predicate';
import {
  GateDiagnostics,
  projectDurableDiagnostics,
  applyDurableDiagnostics,
  inspectSupervisorOwnership,
} from './t044-diagnostics';
const diagnostics = new GateDiagnostics();
const attemptId = randomUUID();
let failureRecorded = false;
async function recordFailure(
  error: unknown,
  durable?: ReturnType<typeof projectDurableDiagnostics>,
) {
  if (durable) applyDurableDiagnostics(diagnostics, durable);
  const evidenceFile = `tests/acceptance/t044-failed-${attemptId}.json`;
  await writeFile(
    evidenceFile,
    JSON.stringify(
      {
        classification: 'developer-executed live acceptance',
        summary: diagnostics.failure(error),
        ...(durable ? { durable } : {}),
      },
      null,
      2,
    ) + '\n',
    { flag: 'wx' },
  );
  failureRecorded = true;
  diagnostics.details.evidenceFile = evidenceFile;
}

// Developer-only live acceptance. Builds the standalone package; never invokes it.
const hash = (text: string | Buffer) =>
  createHash('sha256').update(text).digest('hex');
async function historical() {
  const names = (await readdir('tests/acceptance'))
    .filter((n) => !n.startsWith('t044'))
    .sort();
  return Object.fromEntries(
    await Promise.all(
      names.map(async (n) => [
        n,
        hash(await readFile(resolve('tests/acceptance', n))),
      ]),
    ),
  );
}
async function acceptance() {
  loadLocalEnvironment();
  const config = readConfig(process.env);
  if (!process.env.TEST_DATABASE_URL) throw new Error('TEST DATABASE REQUIRED');
  diagnostics.configured(config.geminiModel);
  diagnostics.progress('CONFIGURATION', true);
  diagnostics.progress('HISTORICAL_SNAPSHOT', false);
  const before = await historical();
  diagnostics.progress('HISTORICAL_SNAPSHOT', true);
  diagnostics.progress('FIXTURE_START', false);
  const target = await startOrderFixture(false);
  diagnostics.progress('FIXTURE_START', true);
  diagnostics.progress('DATABASE_CONNECTION', false);
  const db = await isolatedDatabase().catch(async (error) => {
    await target.close();
    throw error;
  });
  diagnostics.progress('DATABASE_CONNECTION', true);
  let runId: string | undefined;
  let pipelineFailed = false;
  try {
    diagnostics.progress('MIGRATION', false);
    await migrate(db.client, resolve('migrations'));
    diagnostics.progress('MIGRATION', true);
    diagnostics.progress('RUN_CONFIGURATION', false);
    const { run } = await orderConfiguration(
      target.openapi,
      target.url,
      config.geminiModel,
    );
    runId = run.id;
    diagnostics.details.runId = run.id;
    diagnostics.progress('RUN_CONFIGURATION', true);
    diagnostics.progress('SCOPE_APPROVAL', false);
    await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      run.projectId,
      'T044 live controlled acceptance',
    ]);
    await db.client.query(
      "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'SCOPE',$3,$4)",
      [
        run.scope.approvalId,
        run.projectId,
        run.apiSnapshot.contentHash,
        run.scope,
      ],
    );
    diagnostics.progress('SCOPE_APPROVAL', true);
    const result = await runVerticalSlice(
      db.client,
      run,
      createGeminiProvider({
        model: config.geminiModel,
        apiKey: config.geminiApiKey,
        requestsPerMinute: config.geminiRequestsPerMinute,
      }),
      {},
      undefined,
      false,
      true,
      diagnostics.progress,
    );
    diagnostics.observe(result);
    if (
      !('reproduction' in result) ||
      !result.reproduction ||
      result.candidate?.classification !== 'OBSERVED VIOLATION'
    )
      throw new Error('DISCOVERY OR CONFIRMATION INCOMPLETE');
    const r = result.reproduction;
    const ref = result.candidate.predicateRef;
    if (
      result.verification.finding.classification !== 'CONFIRMED' ||
      r.supervised.artifact.verification !== 'VERIFIED' ||
      r.supervised.evidence?.outcome !== 'VIOLATED'
    )
      throw new Error('REPRODUCTION INCOMPLETE');
    diagnostics.progress('PREDICATE_IDENTITY', false);
    const refs = [
      r.initial.evidence.predicateRef,
      ...r.replays.map((t) => t.evidence.predicateRef),
      r.minimization.best.predicateRef,
      r.generated.manifest.predicateRef,
      r.supervised.evidence.predicateRef,
      JSON.parse(r.reports.json).predicateRef,
    ];
    if (refs.some((p) => canonical(p) !== canonical(ref)))
      throw new Error('IDENTITY MISMATCH');
    diagnostics.progress('FRESHNESS_CHECK', false);
    const trials = [
      r.initial,
      ...r.replays,
      { baseline: r.supervised.baseline, evidence: r.supervised.evidence },
    ];
    if (
      trials.some((t) => t.baseline?.verdict !== 'SATISFIED') ||
      new Set(trials.map((t) => t.baseline?.id)).size !== trials.length ||
      new Set(trials.map((t) => t.evidence.trialId)).size !== trials.length
    )
      throw new Error('FRESHNESS FAILURE');
    diagnostics.progress('FRESH_RUNTIME_VALUES', false);
    const creations = (
      await db.client.query(
        "SELECT sanitized_response FROM step_records WHERE run_id=$1 AND sanitized_request->>'operationId'='POST /api/orders'",
        [run.id],
      )
    ).rows.map((row) => row.sanitized_response?.body?.id);
    if (
      creations.length < 3 ||
      creations.some((id) => typeof id !== 'string') ||
      new Set(creations).size !== creations.length
    )
      throw new Error('FRESH RUNTIME VALUES FAILURE');
    diagnostics.progress('SHARED_BUDGET', false);
    const count = Number(
      (
        await db.client.query(
          'SELECT count(*) AS count FROM step_records WHERE run_id=$1',
          [run.id],
        )
      ).rows[0].count,
    );
    let used = 0;
    for (const s of r.budgetSnapshots) {
      if (
        s.budget.acceptedAt !== r.finalBudget.acceptedAt ||
        s.budget.deadlineAt !== r.finalBudget.deadlineAt ||
        canonical(s.budget.limits) !== canonical(r.finalBudget.limits) ||
        s.budget.usedRequests < used
      )
        throw new Error('BUDGET DISCONTINUITY');
      used = s.budget.usedRequests;
    }
    if (
      count !== used ||
      used !== r.finalBudget.usedRequests ||
      r.finalBudget.modelCalls < 1
    )
      throw new Error('BUDGET OR MODEL PROVENANCE FAILURE');
    diagnostics.progress('PACKAGE_IDENTITY', false);
    if (
      r.bundle.manifestHash !== r.generated.artifact.manifestHash ||
      hash(canonical(r.generated.manifest)) !== r.bundle.manifestHash ||
      r.bundle.inputs.some((p) =>
        /http-executor|src\/server\/|planning\/|node_modules\/(?:pg|@google)\//.test(
          p,
        ),
      )
    )
      throw new Error('PACKAGE IDENTITY OR ISOLATION FAILURE');
    diagnostics.progress('HISTORICAL_IMMUTABILITY', false);
    if (canonical(before) !== canonical(await historical()))
      throw new Error('HISTORICAL EVIDENCE CHANGED');
    const summary = {
      task: 'T044',
      result: 'PASS',
      provider: 'gemini',
      model: config.geminiModel,
      runId: run.id,
      discoveryStatus: result.candidate.classification,
      confirmationStatus: result.verification.finding.classification,
      predicateId: ref.id,
      predicateVersion: ref.version,
      predicateHash: ref.hash,
      originalJourneyLength: r.minimization.originalLength,
      bestVerifiedJourneyLength: r.minimization.bestLength,
      reportGenerated: true,
      manifestHash: r.bundle.manifestHash,
      supervisedVerificationStatus: r.supervised.evidence.outcome,
      artifactStatus: r.supervised.artifact.verification,
      sharedBudgetVerified: true,
      packageHash: r.bundle.packageHash,
      standaloneIsolationVerified: true,
      historicalEvidenceUnchanged: true,
    };
    const evidence = {
      summary,
      initial: r.initial,
      replays: r.replays,
      minimization: r.minimization,
      generated: r.generated,
      supervised: r.supervised,
      budgetSnapshots: r.budgetSnapshots,
      finalBudget: r.finalBudget,
      bundle: {
        manifestHash: r.bundle.manifestHash,
        packageHash: r.bundle.packageHash,
        runnerHash: r.bundle.runnerHash,
        inputs: r.bundle.inputs,
      },
    };
    const serialized = JSON.stringify(evidence, null, 2) + '\n';
    diagnostics.progress('SANITIZATION', false);
    const contents =
      serialized + r.reports.markdown + r.reports.json + r.bundle.code;
    for (const secret of [
      config.geminiApiKey,
      config.databaseUrl,
      config.credentialKey.toString('hex'),
      process.env.TEST_DATABASE_URL!,
    ])
      if (contents.includes(secret)) throw new Error('SANITIZATION FAILURE');
    diagnostics.progress('ARTIFACT_WRITE', false);
    const directory = resolve('dist/gate4', run.id);
    await mkdir(directory, { recursive: true });
    for (const [name, data] of [
      ['regression.mjs', r.bundle.code],
      ['manifest.json', canonical(r.generated.manifest)],
      ['report.md', r.reports.markdown],
      ['report.json', r.reports.json],
    ] as const)
      await writeFile(resolve(directory, name), data, { flag: 'wx' });
    const evidenceFile = `tests/acceptance/t044-order-${run.id}.json`;
    await writeFile(evidenceFile, serialized, { flag: 'wx' });
    return {
      ...summary,
      evidenceFile,
      packageDirectory: `dist/gate4/${run.id}`,
    };
  } catch (error) {
    pipelineFailed = true;
    if (error instanceof Error && error.message === 'SUPERVISOR BUSY') {
      diagnostics.details.nextAction =
        'GRACEFULLY STOP THE OWNED SERVER OR OTHER SUPERVISOR; RERUN ONLY AFTER IT RELEASES OWNERSHIP';
      try {
        diagnostics.supervisorOwnership = await inspectSupervisorOwnership(
          db.client,
        );
      } catch {
        diagnostics.details.supervisorOwnership = 'UNAVAILABLE';
      }
    }
    let durable: ReturnType<typeof projectDurableDiagnostics> | undefined;
    if (runId) {
      try {
        const runs = await db.client.query(
          'SELECT id,stop_reason,counters FROM runs WHERE id=$1',
          [runId],
        );
        const evidence = await db.client.query(
          'SELECT id,trial_id,kind,evaluation FROM evidence WHERE run_id=$1 ORDER BY created_at,id',
          [runId],
        );
        const steps = await db.client.query(
          'SELECT phase,outcome FROM step_records WHERE run_id=$1 ORDER BY request_intent_at,id',
          [runId],
        );
        const findings = await db.client.query(
          'SELECT id,current_classification,original_journey_id,minimized_journey_id FROM findings WHERE run_id=$1 ORDER BY id',
          [runId],
        );
        const journeys = await db.client.query(
          "SELECT id,jsonb_array_length(definition->'steps') AS action_count FROM journeys WHERE run_id=$1",
          [runId],
        );
        durable = projectDurableDiagnostics(
          runs.rows,
          evidence.rows,
          steps.rows,
          findings.rows,
          journeys.rows,
        );
      } catch {
        diagnostics.details.durableEvidence = 'UNAVAILABLE';
      }
    }
    try {
      await recordFailure(error, durable);
    } catch {
      diagnostics.details.failureEvidence = 'WRITE FAILED';
    }
    throw error;
  } finally {
    if (!pipelineFailed) diagnostics.progress('CLEANUP', false);
    try {
      try {
        await db.close();
      } finally {
        await target.close();
      }
      if (!pipelineFailed) diagnostics.progress('CLEANUP', true);
    } catch (error) {
      diagnostics.details.cleanupStatus = 'FAILED';
      if (!pipelineFailed) throw error;
      // Preserve the primary pipeline exception already captured in the snapshot.
    }
  }
}
acceptance()
  .then((result) => console.log(JSON.stringify(result)))
  .catch(async (error: unknown) => {
    if (!failureRecorded) {
      try {
        await recordFailure(error);
      } catch {
        diagnostics.details.failureEvidence = 'WRITE FAILED';
      }
    }
    console.log(JSON.stringify(diagnostics.failure(error)));
    process.exitCode = 1;
  });
