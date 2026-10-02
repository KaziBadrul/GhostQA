// Submission-track run orchestration. This module is a thin application
// boundary: it prepares an explicitly allowlisted fixture and then calls the
// existing authoritative path (`runVerticalSlice` -> RunSupervisor ->
// BudgetManager -> frozen scope/operation policy -> cancellation ->
// deterministic HTTP executor). It adds no network authority, no dispatch path,
// and no finding logic of its own.
import { z } from 'zod';
import type { Pool, PoolClient } from 'pg';
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

const FAILURE_DETAIL: Record<DemoFailureCode, string> = {
  'INVALID FIXTURE': 'That fixture is not available in this build.',
  'ANOTHER RUN IN PROGRESS':
    'GhostQA authorizes one supervised run at a time. Wait for the active run to finish.',
  'TARGET UNAVAILABLE': 'The local fixture target could not be started.',
  'MODEL UNAVAILABLE':
    'The configured Gemini model or API key is not usable. Check GEMINI_API_KEY and GEMINI_MODEL.',
  'MODEL QUOTA EXHAUSTED':
    'The reasoning provider refused the request on a quota or rate limit. The run was not retried automatically.',
  'MODEL ERROR': 'The reasoning model returned no usable proposal.',
  STAGNATION: 'The model stopped proposing new distinct journeys.',
  'BUDGET EXHAUSTED': 'The run reached its target request budget.',
  'TIME EXHAUSTED': 'The run reached its wall-clock deadline.',
  'BASELINE ERROR': 'The target did not return to a verified fresh state.',
  'EXECUTION ERROR': 'A trial request failed to execute.',
  'STORAGE ERROR': 'Evidence could not be persisted.',
  CANCELLED: 'The run was cancelled.',
  'ENGINE ERROR': 'The engine stopped for an unclassified reason.',
};

// Provider failures carry a structured diagnostic (an API status or a failure
// kind), never raw provider text. Duck-typing keeps the engine's provider
// classes out of this module's surface.
function providerFailure(error: unknown): DemoFailureCode | undefined {
  const record = error as {
    diagnostic?: { apiStatus?: string; httpStatus?: number };
    telemetry?: { failureKind?: string };
  };
  const status = record.diagnostic?.apiStatus;
  const http = record.diagnostic?.httpStatus;
  if (status === 'RESOURCE_EXHAUSTED' || http === 429)
    return 'MODEL QUOTA EXHAUSTED';
  if (
    status === 'UNAUTHENTICATED' ||
    status === 'PERMISSION_DENIED' ||
    status === 'NOT_FOUND' ||
    status === 'UNAVAILABLE' ||
    status === 'INVALID_ARGUMENT' ||
    http === 401 ||
    http === 403 ||
    http === 404
  )
    return 'MODEL UNAVAILABLE';
  const kind = record.telemetry?.failureKind;
  if (kind === 'MODEL_CONFIGURATION') return 'MODEL UNAVAILABLE';
  if (kind === 'PROVIDER_REQUEST') return 'MODEL UNAVAILABLE';
  if (kind === 'CANCELLED') return 'CANCELLED';
  if (kind === 'PROVIDER_OUTPUT' || kind === 'CONTRACT_VALIDATION')
    return 'MODEL ERROR';
  return undefined;
}

function failureCode(error: unknown): DemoFailureCode {
  const message = error instanceof Error ? error.message : '';
  const fromProvider = providerFailure(error);
  if (fromProvider) return fromProvider;
  if (message === 'SUPERVISOR BUSY') return 'ANOTHER RUN IN PROGRESS';
  if (message === 'STORAGE ERROR' || message === 'PROJECT REQUIRED')
    return 'STORAGE ERROR';
  if (message === 'BASELINE ERROR') return 'BASELINE ERROR';
  if (message === 'BUDGET EXHAUSTED') return 'BUDGET EXHAUSTED';
  if (message === 'TIME EXHAUSTED') return 'TIME EXHAUSTED';
  if (message === 'CANCELLED' || message === 'SHUTDOWN') return 'CANCELLED';
  if (message === 'MODEL ERROR' || message === 'MODEL PLAN ERROR')
    return 'MODEL ERROR';
  if (message === 'STAGNATION') return 'STAGNATION';
  if (message === 'EXECUTION ERROR' || message === 'WORKER ERROR')
    return 'EXECUTION ERROR';
  if (message === 'INVALID FIXTURE') return 'INVALID FIXTURE';
  if (message.startsWith('CONNECTION REFUSED')) return 'TARGET UNAVAILABLE';
  return 'ENGINE ERROR';
}

// ------------------------------------------------------------- live state ----

type TargetHandle = Awaited<ReturnType<typeof startRequiredFixture>>;

interface Live {
  record: DemoRunRecord;
  pool: Pool;
  client: PoolClient;
  target?: TargetHandle;
  writes: Promise<unknown>;
}

interface EngineState {
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
  if (stage === 'RUN_COMPLETION') return completed ? 'COMPLETE' : 'PACKAGING ARTIFACT';
  return 'PACKAGING ARTIFACT';
}

function patch(record: DemoRunRecord, change: Partial<DemoRunRecord>): DemoRunRecord {
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
  if (!finding) return 'NOT EVALUABLE';
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

export async function startDemoRun(fixtureId: DemoFixtureId): Promise<DemoRunRecord> {
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

  void execute(live, fixtureId, config);

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

async function fail(live: Live, error: unknown) {
  // Opt-in operator diagnostic. Never enabled by default, never shown in the UI.
  if (process.env['GHOSTQA_DEMO_DEBUG'] === '1')
    console.error('[ghostqa demo]', error);
  const code = failureCode(error);
  publish(live, {
    state: 'FAILED',
    stage: 'FAILED',
    outcome: 'NOT EVALUABLE',
    finishedAt: new Date().toISOString(),
    counters: (await readCounters(live.record.id)) ?? live.record.counters,
    failure: { code, detail: FAILURE_DETAIL[code] },
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
      [run.scope.approvalId, run.projectId, run.apiSnapshot.contentHash, run.scope],
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
    );

    const counters = await readCounters(live.record.id);
    const reproduction = 'reproduction' in result ? result.reproduction : undefined;
    const verification = 'verification' in result ? result.verification : undefined;

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
export const demoEngine: DemoEngine = {
  startDemoRun,
  demoRunDetail,
  demoRunList,
};