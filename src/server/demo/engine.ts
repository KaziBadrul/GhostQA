import { modelFailureCode, runFailureCode } from '../run-errors';
import { errorGuidance } from '../../lib/error-guidance';
// Submission-track run orchestration. This module is a thin application
// boundary: it prepares an explicitly allowlisted fixture and then calls the
// existing authoritative path (`runVerticalSlice` -> RunSupervisor ->
// BudgetManager -> frozen scope/operation policy -> cancellation ->
// deterministic HTTP executor). It adds no network authority, no dispatch path,
// and no finding logic of its own.
import { z } from 'zod';
import type { Pool, PoolClient } from 'pg';
import type { RunSupervisor } from '../run-supervisor';
import { readConfig } from '../config';
import { createDatabase } from '../db';
import { CredentialStore } from '../credential-store';
import { runVerticalSlice } from '../../cli/vertical-slice';
import { createGeminiProvider } from '../../engine/planning/gemini';
import { RunBudgetSchema } from '../../engine/contracts';
import type { ReproductionStage } from '../../cli/reproduction-progress';
import {
  loadRequiredSuite,
  requiredConfiguration,
  startRequiredFixture,
  type RequiredFixture,
} from '../../../fixtures/required';
import { DEMO_LIMITS as DEMO_LIMITS_SHARED } from '../../lib/demo-view';
import { demoFixture } from './catalog';
import type { DemoEngine } from './runtime';
import {
  DemoCountersSchema,
  DemoFindingSchema,
  DemoRunRecordSchema,
  type DemoCounters,
  type DemoFailureCode,
  type DemoFinding,
  type DemoFixtureId,
  type DemoStage,
  type DemoRunRecord,
} from './contracts';
import {
  listDemoRuns,
  loadDemoRun,
  newDemoRunId,
  saveDemoRun,
  writeDemoReport,
  writeDemoBundle,
} from './store';

// The demo budget is smaller than the engine default so a live presentation
// finishes; the engine still enforces every limit itself.
const DEMO_LIMITS = DEMO_LIMITS_SHARED;

// The authoritative evaluator entry is loaded by the engine path, which runs
// outside the application bundle. It never reaches the browser.
async function evaluatorEntry(id: DemoFixtureId): Promise<RequiredFixture> {
  const suite = await loadRequiredSuite();
  const entry = suite.fixtures.find((candidate) => candidate.id === id);
  if (!entry) throw new Error('INVALID FIXTURE');
  return entry;
}

function failureCode(error: unknown): DemoFailureCode {
  const model = modelFailureCode(error);
  if (model) return model;
  const message = error instanceof Error ? error.message : '';
  if (message.startsWith('CONNECTION REFUSED')) return 'TARGET UNAVAILABLE';
  return runFailureCode(message);
}

// ------------------------------------------------------------- live state ----

type TargetHandle = Awaited<ReturnType<typeof startRequiredFixture>>;

interface Live {
  record: DemoRunRecord;
  pool: Pool;
  client: PoolClient;
  target?: TargetHandle;
  writes: Promise<unknown>;
  supervisor?: RunSupervisor;
  done?: Promise<void>;
}

interface EngineState {
  stopping?: boolean;
  live?: Live;
}

// The dev server re-evaluates route modules on edit; the active supervised run
// must survive that, so the live slot lives on globalThis.
const GLOBAL = globalThis as unknown as { __ghostqaDemoEngine?: EngineState };
const state: EngineState = (GLOBAL.__ghostqaDemoEngine ??= {});

// ------------------------------------------------------------- counters -----

let readPool: Pool | undefined;

function counterPool(): Pool {
  readPool ??= createDatabase(readConfig(process.env).databaseUrl);
  return readPool;
}

// Counters are read on a separate connection so observing a run never competes
// with the supervised run's own client, and so a finished run keeps reporting.
async function readCounters(runId: string): Promise<DemoCounters | null> {
  try {
    const client = await counterPool().connect();
    try {
      const result = await client.query<{ counters: unknown }>(
        'SELECT counters FROM runs WHERE id=$1',
        [runId],
      );
      if (!result.rows[0]) return null;
      const budget = RunBudgetSchema.parse(result.rows[0].counters);
      return DemoCountersSchema.parse({
        usedRequests: budget.usedRequests,
        requestsByPhase: budget.requestsByPhase,
        usedExplorationJourneys: budget.usedExplorationJourneys,
        modelCalls: budget.modelCalls,
        stagnantRounds: budget.stagnantRounds,
      });
    } finally {
      client.release();
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- stage -----

function stageFrom(
  stage: ReproductionStage,
  completed: boolean,
  counters: DemoCounters | null,
): DemoStage {
  if (stage === 'RUN_ADMISSION') return 'ADMITTING RUN';
  if (stage === 'DISCOVERY') {
    const phase = counters?.requestsByPhase ?? {};
    if ((phase['RESET'] ?? 0) === 0) return 'PLANNING JOURNEY';
    if ((phase['BASELINE'] ?? 0) === 0) return 'RESETTING TARGET';
    if ((phase['EXPLORATION'] ?? 0) === 0) return 'VERIFYING BASELINE';
    return 'EXECUTING JOURNEY';
  }
  if (stage === 'CONFIRMATION') return 'CONFIRMING FROM FRESH STATE';
  if (stage === 'MINIMIZATION') return 'MINIMIZING';
  if (stage === 'EVIDENCE_LOADING') return 'LOADING EVIDENCE';
  if (stage === 'REPORT_GENERATION' || stage === 'MANIFEST_GENERATION')
    return 'GENERATING REPORT';
  if (stage === 'SUPERVISED_VERIFICATION') return 'VERIFYING ARTIFACT';
  if (stage === 'RUN_COMPLETION')
    return completed ? 'COMPLETE' : 'PACKAGING ARTIFACT';
  return 'PACKAGING ARTIFACT';
}

function patch(
  record: DemoRunRecord,
  change: Partial<DemoRunRecord>,
): DemoRunRecord {
  return DemoRunRecordSchema.parse({ ...record, ...change });
}

// Publishes are serialized so a slow disk write can never rewind the stage a
// faster progress callback already advanced past.
function publish(live: Live, change: Partial<DemoRunRecord>): DemoRunRecord {
  live.record = patch(live.record, change);
  live.writes = live.writes
    .catch(() => undefined)
    .then(() => saveDemoRun(live.record))
    .catch(() => undefined);
  return live.record;
}

// --------------------------------------------------------------- outcome ----

const RawFinding = z
  .object({
    id: z.string(),
    classification: z.string(),
    consistent: z.boolean(),
    predicateRef: z.object({ hash: z.string() }),
    minimizationStop: z.string().optional(),
  })
  .nullable();

function outcomeOf(finding: DemoFinding | null): DemoRunRecord['outcome'] {
  if (!finding) return 'NO CONFIRMED VIOLATION';
  if (finding.classification === 'CONFIRMED' && finding.consistent)
    return 'VIOLATION CONFIRMED';
  if (
    finding.classification === 'NON-REPRODUCED' ||
    finding.classification === 'INCONCLUSIVE'
  )
    return 'NO CONFIRMED VIOLATION';
  return 'NOT EVALUABLE';
}

function toFinding(
  raw: z.infer<typeof RawFinding>,
  sourceRef: string,
  lengths: { original: number | null; minimized: number | null },
  artifactStatus: string | null,
): DemoFinding | null {
  if (!raw) return null;
  return DemoFindingSchema.parse({
    id: raw.id,
    classification: raw.classification,
    consistent: raw.consistent,
    predicateSourceRef: sourceRef,
    predicateHash: raw.predicateRef.hash,
    originalLength: lengths.original,
    minimizedLength: lengths.minimized,
    minimizationStop: raw.minimizationStop ?? null,
    artifactStatus,
  });
}

// --------------------------------------------------------------- starting ---

export async function startDemoRun(
  fixtureId: DemoFixtureId,
): Promise<DemoRunRecord> {
  if (state.stopping) throw new Error('ENGINE ERROR');
  if (state.live) throw new Error('ANOTHER RUN IN PROGRESS');
  const config = readConfig(process.env);
  const record = DemoRunRecordSchema.parse({
    id: await newDemoRunId(),
    fixtureId,
    mode: 'LIVE',
    state: 'QUEUED',
    stage: 'QUEUED',
    outcome: 'PENDING',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    counters: null,
    stopReason: null,
    finding: null,
    failure: null,
    reportAvailable: false,
  });
  const pool = createDatabase(config.databaseUrl);
  const client = await pool.connect();
  const live: Live = { record, pool, client, writes: Promise.resolve() };
  state.live = live;
  await live.writes;

  live.done = execute(live, fixtureId, config);

  return live.record;
}

async function teardown(live: Live) {
  if (state.live === live) state.live = undefined;
  await live.writes;
  try {
    await live.target?.close();
  } catch {
    /* The fixture is local and disposable. */
  }
  try {
    live.client.release();
  } catch {
    /* A failed connection already released its handle. */
  }
  try {
    await live.pool.end();
  } catch {
    /* Pool shutdown is best effort. */
  }
}

async function fail(live: Live, error: unknown, reason?: string) {
  // Opt-in operator diagnostic. Never enabled by default, never shown in the UI.
  if (process.env['GHOSTQA_DEMO_DEBUG'] === '1')
    console.error('[ghostqa demo]', failureCode(error));
  const code = reason ? runFailureCode(reason, error) : failureCode(error);
  publish(live, {
    state: 'FAILED',
    stage: 'FAILED',
    outcome: 'NOT EVALUABLE',
    finishedAt: new Date().toISOString(),
    counters: (await readCounters(live.record.id)) ?? live.record.counters,
    failure: {
      code,
      detail: `${errorGuidance(code).message} ${errorGuidance(code).action}`,
    },
  });
  await teardown(live);
}

async function execute(
  live: Live,
  fixtureId: DemoFixtureId,
  config: ReturnType<typeof readConfig>,
) {
  try {
    publish(live, { state: 'RUNNING', stage: 'ADMITTING RUN' });

    const onProgress = (next: ReproductionStage, completed: boolean) => {
      publish(live, {
        stage: stageFrom(next, completed, live.record.counters),
      });
    };

    const publicFixture = await demoFixture(fixtureId);
    if (!publicFixture) throw new Error('INVALID FIXTURE');
    const entry: RequiredFixture = await evaluatorEntry(fixtureId);
    live.target = await startRequiredFixture(entry, false);

    const run = await requiredConfiguration(
      entry,
      live.target.openapi,
      live.target.url,
      { provider: 'gemini', model: config.geminiModel },
    );
    run.budget.limits = { ...DEMO_LIMITS };
    // The presented run id is the engine's run id, so a dashboard id, the
    // persisted run row and every recorded artifact id are the same value.
    run.id = live.record.id;
    await live.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      run.projectId,
      'submission demo run',
    ]);
    await live.client.query(
      "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'SCOPE',$3,$4)",
      [
        run.scope.approvalId,
        run.projectId,
        run.apiSnapshot.contentHash,
        run.scope,
      ],
    );

    const result = await runVerticalSlice(
      live.client,
      run,
      createGeminiProvider({
        model: config.geminiModel,
        apiKey: config.geminiApiKey,
        requestsPerMinute: config.geminiRequestsPerMinute,
      }),
      {},
      new CredentialStore(live.client, config.credentialKey),
      true,
      true,
      onProgress,
      {
        supervisor: (supervisor) => {
          live.supervisor = supervisor;
          if (state.stopping) supervisor.closeGate('SHUTDOWN');
        },
      },
    );

    if (
      [
        'MODEL ERROR',
        'MODEL PLAN ERROR',
        'BASELINE ERROR',
        'EXECUTION ERROR',
        'STORAGE ERROR',
        'OWNERSHIP LOST',
        'WORKER ERROR',
        'CANCELLED',
        'SHUTDOWN',
      ].includes(result.stopReason)
    ) {
      const diagnostic = await live.client.query<{
        evaluation: { telemetry?: unknown };
      }>(
        "SELECT evaluation FROM evidence WHERE run_id=$1 AND kind='PLANNING RESULT' ORDER BY created_at DESC LIMIT 1",
        [live.record.id],
      );
      const telemetry = diagnostic.rows[0]?.evaluation.telemetry;
      publish(live, { stopReason: result.stopReason });
      await fail(live, telemetry, result.stopReason);
      return;
    }
    const counters = await readCounters(live.record.id);
    const reproduction =
      'reproduction' in result ? result.reproduction : undefined;
    const verification =
      'verification' in result ? result.verification : undefined;

    let finding: DemoFinding | null;
    if (reproduction) {
      finding = toFinding(
        RawFinding.parse(reproduction.minimization.finding),
        entry.invariant.sourceRef,
        {
          original: reproduction.minimization.originalLength,
          minimized: reproduction.minimization.bestLength,
        },
        reproduction.supervised.artifact.verification,
      );
      await writeDemoBundle(live.record.id, reproduction.bundle);
      await writeDemoReport(
        live.record.id,
        reproduction.reports.markdown,
        JSON.parse(reproduction.reports.json),
      );
    } else {
      finding = toFinding(
        RawFinding.parse(verification?.finding ?? null),
        entry.invariant.sourceRef,
        { original: null, minimized: null },
        null,
      );
    }

    publish(live, {
      state: 'SUCCEEDED',
      stage: 'COMPLETE',
      outcome: outcomeOf(finding),
      finishedAt: new Date().toISOString(),
      counters,
      stopReason: result.stopReason,
      finding,
      reportAvailable: Boolean(reproduction),
    });
    await teardown(live);
  } catch (error) {
    await fail(live, error);
  }
}

// -------------------------------------------------------------- reading -----

async function demoRunDetail(id: string): Promise<DemoRunRecord | undefined> {
  const live = state.live?.record.id === id ? state.live : undefined;
  const stored = live ? live.record : await loadDemoRun(id);
  if (!stored) return undefined;
  const counters = live ? await readCounters(id) : null;
  return patch(stored, { counters: counters ?? stored.counters });
}

async function demoRunList() {
  const stored = await listDemoRuns();
  if (state.live && !stored.some((run) => run.id === state.live!.record.id))
    stored.unshift(state.live.record);
  return { activeRunId: state.live?.record.id ?? null, runs: stored };
}

// Installed by `server.ts`. Route handlers and server components import
// `./runtime` instead, so this module never enters an application bundle.
export async function cancelDemoRun(id: string) {
  if (state.live?.record.id === id) {
    state.live.supervisor?.cancel();
    if (!state.live.supervisor) throw new Error('RUN ADMISSION IN PROGRESS');
    return { state: 'STOPPING', dispatchDisabled: true };
  }
  if (!(await loadDemoRun(id))) throw new Error('NOT FOUND');
  return { state: 'STOPPED', dispatchDisabled: true };
}
export async function shutdownDemo() {
  state.stopping = true;
  const live = state.live;
  live?.supervisor?.closeGate('SHUTDOWN');
  await live?.done;
  await readPool?.end();
}
export const demoEngine: DemoEngine = {
  cancelDemoRun,
  shutdown: shutdownDemo,
  startDemoRun,
  demoRunDetail,
  demoRunList,
};
