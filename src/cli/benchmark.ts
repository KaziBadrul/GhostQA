import {
  defaultModelRequestsPerMinute,
  ModelRequestsPerMinuteSchema,
} from '../engine/planning/pacing';
import type { PoolClient } from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import {
  loadRequiredSuite,
  RequiredSuiteSchema,
  requiredConfiguration,
  startRequiredFixture,
  evaluatorJourney,
  type RequiredSuite,
  type RequiredFixture,
} from '../../fixtures/required';
import { canonical } from '../engine/detection/predicate';
import { RunBudgetSchema, type Run } from '../engine/contracts';
import { defaultLimits } from '../engine/budget/manager';
import { type ReasoningProvider } from '../engine/planning/provider';
import { createGeminiProvider } from '../engine/planning/gemini';
import { createDatabase } from '../server/db';
import { migrate } from '../server/migrate';
import { loadLocalEnvironment, readConfig } from '../server/config';
import { runVerticalSlice } from './vertical-slice';

const hash = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');
const Mode = z.enum(['AUTONOMOUS_DISCOVERY', 'SUPPLIED_REDUNDANCY']);
export type Mode = z.infer<typeof Mode>;
const Identity = z.strictObject({
  provider: z.enum(['gemini', 'controlled', 'evaluator']),
  model: z.string().regex(/^(?:models\/)?[A-Za-z0-9._-]+$/),
});
type Identity = z.infer<typeof Identity>;
export async function selectSuite(selection: 'required' | 'supplemental') {
  if (selection !== 'required') throw Error('SUPPLEMENTAL SUITE UNAVAILABLE');
  return loadRequiredSuite();
}
const Assignment = z.strictObject({
  ordinal: z.int().positive(),
  fixtureId: z.enum(['order-lifecycle', 'inventory', 'workflow']),
  variant: z.enum(['faulty', 'repaired']),
  repetition: z.int().min(1).max(5),
  runId: z.uuid(),
  mode: Mode,
});
export type Assignment = z.infer<typeof Assignment>;
export function assignTrials(value: RequiredSuite, mode: Mode): Assignment[] {
  const suite = RequiredSuiteSchema.parse(value);
  Mode.parse(mode);
  const assignments: Assignment[] = [];
  for (const entry of suite.fixtures)
    for (const variant of (mode === 'SUPPLIED_REDUNDANCY'
      ? ['faulty']
      : ['faulty', 'repaired']) as Assignment['variant'][])
      for (
        let repetition = 1;
        repetition <= (mode === 'SUPPLIED_REDUNDANCY' ? 1 : 5);
        repetition++
      )
        assignments.push({
          ordinal: assignments.length + 1,
          fixtureId: entry.id,
          variant,
          repetition,
          runId: randomUUID(),
          mode,
        });
  return assignments;
}
const Token = z.strictObject({
  value: z.int().nonnegative().nullable(),
  source: z.enum(['PROVIDER', 'ESTIMATED', 'UNKNOWN']),
});
export function tokenMetric(
  count: number | undefined,
  estimated: boolean,
  bytes: string | undefined,
): z.infer<typeof Token> {
  if (count !== undefined)
    return Token.parse({
      value: count,
      source: estimated ? 'ESTIMATED' : 'PROVIDER',
    });
  return bytes === undefined
    ? { value: null, source: 'UNKNOWN' }
    : { value: Math.ceil(Buffer.byteLength(bytes) / 4), source: 'ESTIMATED' };
}
const RecordSchema = z.strictObject({
  assignment: Assignment,
  discoveryStatus: z.enum([
    'OBSERVED VIOLATION',
    'NOT OBSERVED',
    'NOT MEASURED',
    'UNKNOWN',
  ]),
  confirmationStatus: z.enum([
    'CONFIRMED',
    'NON-REPRODUCED',
    'INCONCLUSIVE',
    'NOT ATTEMPTED',
    'UNKNOWN',
  ]),
  stopReason: z.string().max(80),
  artifactStatus: z.enum(['VERIFIED', 'UNVERIFIED', 'NOT GENERATED']),
  baselines: z.array(
    z.strictObject({
      id: z.uuid(),
      trialId: z.uuid(),
      verdict: z.enum(['SATISFIED', 'VIOLATED', 'UNEVALUABLE']),
    }),
  ),
  trialIds: z.array(z.uuid()),
  metrics: z.strictObject({
    requests: z.int().nonnegative().nullable(),
    phaseRequests: RunBudgetSchema.shape.requestsByPhase.nullable(),
    journeys: z.int().nonnegative().nullable(),
    modelCalls: z.int().nonnegative().nullable(),
    inputTokens: Token,
    outputTokens: Token,
    originalLength: z.int().nonnegative().nullable(),
    bestLength: z.int().nonnegative().nullable(),
  }),
  configurationHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
});
export type BenchmarkRecord = z.infer<typeof RecordSchema>;
export function emptyRecord(
  assignment: Assignment,
  stopReason: string,
): BenchmarkRecord {
  return {
    assignment,
    discoveryStatus:
      assignment.mode === 'SUPPLIED_REDUNDANCY' ? 'NOT MEASURED' : 'UNKNOWN',
    confirmationStatus: 'UNKNOWN',
    stopReason,
    artifactStatus: 'NOT GENERATED',
    baselines: [],
    trialIds: [],
    metrics: {
      requests: null,
      phaseRequests: null,
      journeys: null,
      modelCalls: null,
      inputTokens: { value: null, source: 'UNKNOWN' },
      outputTokens: { value: null, source: 'UNKNOWN' },
      originalLength: null,
      bestLength: null,
    },
    configurationHash: null,
  };
}
export function summarizeBenchmark(records: BenchmarkRecord[]) {
  return ['order-lifecycle', 'inventory', 'workflow'].flatMap((fixtureId) =>
    ['faulty', 'repaired'].flatMap((variant) => {
      const group = records.filter(
        (r) =>
          r.assignment.mode === 'AUTONOMOUS_DISCOVERY' &&
          r.assignment.fixtureId === fixtureId &&
          r.assignment.variant === variant,
      );
      if (!group.length) return [];
      if (
        group.length !== 5 ||
        new Set(group.map((r) => r.assignment.repetition)).size !== 5
      )
        throw Error('INCOMPLETE ASSIGNED DENOMINATOR');
      const discovered = group.filter(
          (r) => r.discoveryStatus === 'OBSERVED VIOLATION',
        ).length,
        confirmed = group.filter(
          (r) => r.confirmationStatus === 'CONFIRMED',
        ).length;
      return [
        {
          fixtureId,
          variant,
          denominator: 5,
          discovered,
          confirmed,
          discoveryRate: discovered / 5,
          confirmationRate: confirmed / 5,
          ...(variant === 'repaired'
            ? { falsePositiveRate: confirmed / 5 }
            : {}),
        },
      ];
    }),
  );
}
async function tree(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? tree(join(directory, e.name))
          : Promise.resolve([join(directory, e.name)]),
      ),
    )
  )
    .flat()
    .sort();
}
async function fileHashes(paths: string[]) {
  return Object.fromEntries(
    await Promise.all(
      paths.sort().map(async (path) => [path, hash(await readFile(path))]),
    ),
  );
}
export async function freezeBenchmark(
  suite: RequiredSuite,
  value: Identity,
  mode: Mode,
  requestsPerMinute = defaultModelRequestsPerMinute,
) {
  const pacingRpm = ModelRequestsPerMinuteSchema.parse(requestsPerMinute);
  const identity = Identity.parse(value);
  RequiredSuiteSchema.parse(suite);
  Mode.parse(mode);
  const engineFiles = await fileHashes(
    (
      await Promise.all(
        ['src/engine', 'src/server', 'src/transport', 'src/cli'].map(tree),
      )
    )
      .flat()
      .concat(['scripts/build-engine.mjs', 'package.json']),
  );
  const promptFiles = await fileHashes([
    'src/engine/planning/gemini.ts',
    'src/engine/planning/gemini-schema.ts',
    'src/engine/planning/context.ts',
  ]);
  const fixtureFiles = await fileHashes([
    'fixtures/required.ts',
    'fixtures/private/required-suite.json',
    'scripts/t035-configuration.ts',
    ...suite.fixtures.flatMap((f) => [f.module, f.openapi]),
  ]);
  const buildFiles = await fileHashes([
    'dist/engine-worker.mjs',
    'dist/import-worker.mjs',
  ]);
  const configuration = {
    formatVersion: 1,
    mode,
    identity,
    modelPacing: {
      requestsPerMinute: pacingRpm,
      minimumDispatchSpacingMs: 60000 / pacingRpm,
    },
    limits: defaultLimits,
    trialsPerVariant: mode === 'AUTONOMOUS_DISCOVERY' ? 5 : 1,
    suiteHash: hash(canonical(suite)),
    runtime: process.version,
    platform: process.platform,
    architecture: process.arch,
    selection: 'required',
    inputs: {},
    credentials: 'NONE',
    scope:
      'explicit owned loopback /api; frozen phase policy; mutations acknowledged',
  };
  return {
    engineHash: hash(canonical(engineFiles)),
    promptHash: hash(canonical(promptFiles)),
    dependencyHash: hash(await readFile('package-lock.json')),
    modelHash: hash(canonical(identity)),
    fixtureHash: hash(canonical(fixtureFiles)),
    configurationHash: hash(canonical(configuration)),
    buildHash: hash(canonical(buildFiles)),
    configuration,
    files: { engineFiles, promptFiles, fixtureFiles, buildFiles },
  };
}
export type FrozenBenchmark = Awaited<ReturnType<typeof freezeBenchmark>>;
const knownReasons = new Set([
  'MODEL ERROR',
  'MODEL PLAN ERROR',
  'BUDGET EXHAUSTED',
  'TIME EXHAUSTED',
  'JOURNEY LIMIT',
  'STAGNATION',
  'CANCELLED',
  'BASELINE ERROR',
  'EXECUTION ERROR',
  'STORAGE ERROR',
  'OWNERSHIP LOST',
  'SUPERVISOR BUSY',
  'WORKER ERROR',
  'SHUTDOWN',
  'REPRODUCTION COMPLETE',
  'VERIFICATION COMPLETE',
  'DISCOVERY COMPLETE',
  'BUILD CHANGED',
]);
function safeReason(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return knownReasons.has(message) ? message : 'HARNESS ERROR';
}
export async function runBenchmark(input: {
  suite: RequiredSuite;
  mode: Mode;
  execute: (assignment: Assignment) => Promise<BenchmarkRecord>;
  directory?: string;
  freeze?: FrozenBenchmark;
  signal?: AbortSignal;
  assertFrozen?: () => Promise<void>;
}) {
  const assignments = assignTrials(input.suite, input.mode),
    records: BenchmarkRecord[] = [];
  if (input.directory) {
    if (!input.freeze) throw Error('FROZEN CONFIGURATION REQUIRED');
    await mkdir(input.directory, { recursive: true });
    await writeFile(
      join(input.directory, 'series.json'),
      canonical({
        formatVersion: 1,
        mode: input.mode,
        freeze: input.freeze,
        assignments,
      }),
      { flag: 'wx', mode: 0o600 },
    );
  }
  let changed = false;
  for (const a of assignments) {
    if (input.directory)
      await writeFile(
        join(input.directory, `${a.ordinal}-assigned.json`),
        canonical(a),
        { flag: 'wx', mode: 0o600 },
      );
    let record: BenchmarkRecord;
    if (!changed && input.assertFrozen)
      try {
        await input.assertFrozen();
      } catch {
        changed = true;
      }
    if (changed || input.signal?.aborted)
      record = emptyRecord(a, changed ? 'BUILD CHANGED' : 'CANCELLED');
    else
      try {
        record = RecordSchema.parse(await input.execute(a));
        if (canonical(record.assignment) !== canonical(a))
          throw Error('ASSIGNMENT MISMATCH');
      } catch (error) {
        record = emptyRecord(a, safeReason(error));
      }
    records.push(record);
    if (input.directory)
      await writeFile(
        join(input.directory, `${a.ordinal}-result.json`),
        canonical(record),
        { flag: 'wx', mode: 0o600 },
      );
  }
  if (input.assertFrozen)
    try {
      await input.assertFrozen();
    } catch {
      changed = true;
    }
  if (input.directory)
    await writeFile(
      join(input.directory, 'summary.json'),
      canonical({
        records,
        rates: summarizeBenchmark(records),
        frozenIdentityUnchanged: !changed,
      }),
      { flag: 'wx', mode: 0o600 },
    );
  return Object.assign(records, { frozenIdentityUnchanged: !changed });
}
// Inspection only after a crash: missing outcomes stay in the denominator. No resume.
export async function readBenchmark(directory: string) {
  const series = z
    .object({ assignments: z.array(Assignment) })
    .parse(JSON.parse(await readFile(join(directory, 'series.json'), 'utf8')));
  const records: BenchmarkRecord[] = [];
  for (const assignment of series.assignments) {
    try {
      const record = RecordSchema.parse(
        JSON.parse(
          await readFile(
            join(directory, `${assignment.ordinal}-result.json`),
            'utf8',
          ),
        ),
      );
      if (canonical(record.assignment) !== canonical(assignment))
        throw Error('ASSIGNMENT MISMATCH');
      records.push(record);
    } catch {
      records.push(emptyRecord(assignment, 'INTERRUPTED OR INVALID RESULT'));
    }
  }
  return { records, rates: summarizeBenchmark(records) };
}

const EvidenceRow = z.strictObject({
  id: z.uuid(),
  trial_id: z.uuid(),
  kind: z.string(),
  evaluation: z.record(z.string(), z.unknown()),
});
export const totalTokens = (values: z.infer<typeof Token>[]) =>
  values.length === 0 || values.some((v) => v.value === null)
    ? { value: null, source: 'UNKNOWN' as const }
    : {
        value: values.reduce((n, v) => n + v.value!, 0),
        source: values.some((v) => v.source === 'ESTIMATED')
          ? ('ESTIMATED' as const)
          : ('PROVIDER' as const),
      };
// Consume persisted usage attribution, not the provider's name. Failed calls
// carry local input estimates; a missing output is never an invented zero.
export function planningTokenMetrics(
  context: unknown,
  body: Record<string, unknown> | undefined,
) {
  const telemetry = z
    .record(z.string(), z.unknown())
    .parse(body?.telemetry ?? body ?? {});
  const usage = z
    .object({
      inputTokens: z.int().nonnegative().optional(),
      outputTokens: z.int().nonnegative().optional(),
      estimated: z.boolean().default(true),
    })
    .parse(telemetry.usage ?? {});
  return {
    input: tokenMetric(
      usage.inputTokens,
      usage.estimated,
      JSON.stringify(context),
    ),
    output: tokenMetric(
      usage.outputTokens,
      usage.estimated,
      body && 'proposal' in body ? JSON.stringify(body.proposal) : undefined,
    ),
  };
}
export async function executeBenchmarkTrial(
  a: Assignment,
  entry: RequiredFixture,
  options: {
    databaseUrl: string;
    identity: Identity;
    providerFor: (run: Run) => ReasoningProvider;
    directory?: string;
  },
): Promise<BenchmarkRecord> {
  Assignment.parse(a);
  if (entry.id !== a.fixtureId) throw Error('ASSIGNMENT MISMATCH');
  const record = emptyRecord(a, 'HARNESS ERROR'),
    fixture = await startRequiredFixture(entry, a.variant === 'repaired'),
    pool = createDatabase(options.databaseUrl);
  const schema = 'benchmark_' + randomUUID().replaceAll('-', '');
  let client: PoolClient | undefined,
    created = false;
  try {
    client = await pool.connect();
    await client.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await client.query(`SET search_path TO "${schema}"`);
    await migrate(client, resolve('migrations'));
    const run = await requiredConfiguration(
      entry,
      fixture.openapi,
      fixture.url,
      Identity.parse(options.identity),
    );
    run.id = a.runId;
    record.configurationHash = hash(canonical(run));
    await client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      run.projectId,
      'benchmark local trial',
    ]);
    await client.query(
      "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'SCOPE',$3,$4)",
      [
        run.scope.approvalId,
        run.projectId,
        run.apiSnapshot.contentHash,
        run.scope,
      ],
    );
    let result: Awaited<ReturnType<typeof runVerticalSlice>> | undefined;
    try {
      result = await runVerticalSlice(
        client,
        run,
        options.providerFor(run),
        {},
        undefined,
        false,
        true,
      );
      record.stopReason = result.stopReason;
    } catch (error) {
      record.stopReason = safeReason(error);
    }
    const persisted = await client.query(
      'SELECT counters,stop_reason FROM runs WHERE id=$1',
      [run.id],
    );
    const evidence = (
      await client.query(
        'SELECT id,trial_id,kind,evaluation FROM evidence WHERE run_id=$1 ORDER BY created_at,id',
        [run.id],
      )
    ).rows.map((v) => EvidenceRow.parse(v));
    record.baselines = evidence
      .filter((e) => e.kind === 'BASELINE')
      .map((e) => ({
        id: e.id,
        trialId: e.trial_id,
        verdict: z
          .enum(['SATISFIED', 'VIOLATED', 'UNEVALUABLE'])
          .parse(e.evaluation.verdict),
      }));
    record.trialIds = [
      ...new Set(
        (
          await client.query(
            'SELECT trial_id FROM step_records WHERE run_id=$1',
            [run.id],
          )
        ).rows.map((v) => z.uuid().parse(v.trial_id)),
      ),
    ];
    if (persisted.rows[0]) {
      const counters = RunBudgetSchema.parse(persisted.rows[0].counters);
      record.metrics.requests = counters.usedRequests;
      record.metrics.phaseRequests = counters.requestsByPhase;
      record.metrics.journeys = counters.usedExplorationJourneys;
      record.metrics.modelCalls = counters.modelCalls;
    }
    const finding = (
      await client.query(
        'SELECT current_classification,consistent FROM findings WHERE project_id=$1',
        [run.projectId],
      )
    ).rows[0];
    record.discoveryStatus =
      a.mode === 'SUPPLIED_REDUNDANCY'
        ? 'NOT MEASURED'
        : finding
          ? 'OBSERVED VIOLATION'
          : persisted.rows.length
            ? 'NOT OBSERVED'
            : 'UNKNOWN';
    record.confirmationStatus =
      finding?.current_classification === 'CONFIRMED' && finding.consistent
        ? 'CONFIRMED'
        : finding
          ? z
              .enum(['NON-REPRODUCED', 'INCONCLUSIVE', 'OBSERVED VIOLATION'])
              .parse(finding.current_classification) === 'NON-REPRODUCED'
            ? 'NON-REPRODUCED'
            : 'INCONCLUSIVE'
          : 'NOT ATTEMPTED';
    const ins: z.infer<typeof Token>[] = [],
      outs: z.infer<typeof Token>[] = [];
    for (const intent of evidence.filter((e) => e.kind === 'PLANNING INTENT')) {
      const completed = evidence.find(
        (e) => e.kind === 'PLANNING RESULT' && e.trial_id === intent.trial_id,
      );
      const body = completed?.evaluation;
      const tokens = planningTokenMetrics(intent.evaluation.context, body);
      ins.push(tokens.input);
      outs.push(tokens.output);
    }
    record.metrics.inputTokens = totalTokens(ins);
    record.metrics.outputTokens = totalTokens(outs);
    if (result && 'reproduction' in result && result.reproduction) {
      const r = result.reproduction;
      record.metrics.originalLength = r.minimization.originalLength;
      record.metrics.bestLength = r.minimization.bestLength;
      record.artifactStatus = r.supervised.artifact.verification;
      if (options.directory) {
        await mkdir(options.directory, { recursive: true });
        for (const [name, data] of [
          ['manifest.json', r.generated.bytes],
          ['report.md', r.reports.markdown],
          ['report.json', r.reports.json],
          ['regression.mjs', r.bundle.code],
        ] as const)
          await writeFile(join(options.directory, name), data, {
            flag: 'wx',
            mode: 0o600,
          });
      }
    } else {
      const journey = await client.query(
        'SELECT definition FROM journeys WHERE run_id=$1 AND phase=$2 ORDER BY ordinal LIMIT 1',
        [run.id, 'EXPLORATION'],
      );
      if (journey.rows[0])
        record.metrics.originalLength = z
          .array(z.unknown())
          .parse(journey.rows[0].definition.steps).length;
    }
    if (options.directory) {
      await mkdir(options.directory, { recursive: true });
      await writeFile(
        join(options.directory, 'evidence.json'),
        canonical({
          runId: run.id,
          configurationHash: record.configurationHash,
          evidence,
          budget: persisted.rows[0]?.counters ?? null,
          steps: (
            await client.query('SELECT * FROM step_records WHERE run_id=$1', [
              run.id,
            ])
          ).rows,
        }),
        { flag: 'wx', mode: 0o600 },
      );
    }
    return RecordSchema.parse(record);
  } finally {
    if (client) {
      if (created) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
      client.release();
    }
    await pool.end();
    await fixture.close();
  }
}
export async function benchmarkMain(args: string[]) {
  if (
    !args.includes('--approve-local-fixtures') ||
    !args.includes('--output') ||
    args.some(
      (a, i) =>
        !['--approve-local-fixtures', '--output', '--redundant-only'].includes(
          a,
        ) && args[i - 1] !== '--output',
    ) ||
    new Set(args).size !== args.length ||
    args.indexOf('--output') === args.length - 1 ||
    args[args.indexOf('--output') + 1]?.startsWith('--')
  )
    throw Error(
      'USAGE: benchmark --approve-local-fixtures --output <new-directory> [--redundant-only]',
    );
  loadLocalEnvironment();
  const config = readConfig(process.env);
  if (!process.env.TEST_DATABASE_URL) throw Error('TEST DATABASE REQUIRED');
  const suite = await selectSuite('required'),
    mode: Mode = args.includes('--redundant-only')
      ? 'SUPPLIED_REDUNDANCY'
      : 'AUTONOMOUS_DISCOVERY';
  const identity: Identity =
    mode === 'SUPPLIED_REDUNDANCY'
      ? { provider: 'evaluator', model: 'supplied-journey' }
      : { provider: 'gemini', model: config.geminiModel };
  const freeze = await freezeBenchmark(
      suite,
      identity,
      mode,
      config.geminiRequestsPerMinute,
    ),
    directory = args[args.indexOf('--output') + 1]!,
    controller = new AbortController(),
    cancel = () => controller.abort();
  process.on('SIGINT', cancel);
  process.on('SIGTERM', cancel);
  try {
    const records = await runBenchmark({
      suite,
      mode,
      directory,
      freeze,
      signal: controller.signal,
      assertFrozen: async () => {
        if (
          canonical(
            await freezeBenchmark(
              suite,
              identity,
              mode,
              config.geminiRequestsPerMinute,
            ),
          ) !== canonical(freeze)
        )
          throw Error('BUILD CHANGED');
      },
      execute: async (a) => {
        const entry = suite.fixtures.find((e) => e.id === a.fixtureId)!;
        return executeBenchmarkTrial(a, entry, {
          databaseUrl: process.env.TEST_DATABASE_URL!,
          identity,
          directory: join(directory, String(a.ordinal)),
          providerFor: (run) =>
            mode === 'SUPPLIED_REDUNDANCY'
              ? {
                  identity,
                  propose: async () => ({
                    ...identity,
                    proposal: evaluatorJourney(entry, run, true),
                    usage: { estimated: true },
                  }),
                }
              : createGeminiProvider({
                  model: config.geminiModel,
                  apiKey: config.geminiApiKey,
                  requestsPerMinute: config.geminiRequestsPerMinute,
                }),
        });
      },
    });
    console.log(
      canonical({
        mode,
        frozenIdentityUnchanged: records.frozenIdentityUnchanged,
        assigned: records.length,
        rates: summarizeBenchmark(records),
        directory,
      }),
    );
    if (
      !records.frozenIdentityUnchanged ||
      records.some((r) => r.stopReason === 'BUILD CHANGED')
    )
      process.exitCode = 1;
  } finally {
    process.off('SIGINT', cancel);
    process.off('SIGTERM', cancel);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  void benchmarkMain(process.argv.slice(2)).catch(() => {
    console.error('BENCHMARK FAILED');
    process.exitCode = 1;
  });
