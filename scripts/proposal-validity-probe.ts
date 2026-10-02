/**
 * proposal-validity-probe.ts
 *
 * DIAGNOSTIC ONLY — NOT GATE 5 ACCEPTANCE EVIDENCE
 *
 * Measures whether generated proposals survive the normal deterministic
 * proposal/plan validation boundary WITHOUT invoking any target API execution.
 *
 * Reuses: Gemini provider → requestProposal → deterministic proposal/journey
 * validation. Stops BEFORE any target API execution. No dispatcher, transport,
 * reset, baseline or journey execution module is imported or reachable here.
 *
 * Command:
 *   npx tsx scripts/proposal-validity-probe.ts
 *   npx tsx scripts/proposal-validity-probe.ts --samples-per-fixture 10
 *
 * Persisted under --output <dir> (default tests/diagnostics/proposal-validity):
 *   results.json  — one allowlisted record per requested sample, rewritten
 *                   durably after every sample so completed evidence survives a
 *                   later failure.
 *   summary.json  — aggregates derived from exactly those persisted records.
 *
 * This file must never become Gate 5 acceptance evidence: gate5AcceptanceEvidence
 * is a literal false in every persisted document.
 */

import { randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { RunSchema, type Run } from '../src/engine/contracts';
import { buildPlanningContext } from '../src/engine/planning/context';
import { createGeminiProvider } from '../src/engine/planning/gemini';
import {
  PlanningError,
  ProviderDiagnosticSchema,
  ProposalFailureKindSchema,
  requestProposal,
  type ReasoningProvider,
} from '../src/engine/planning/provider';
import { createModelPacer } from '../src/engine/planning/pacing';
import { SecretVault } from '../src/engine/secrets/vault';
import { loadLocalEnvironment, readConfig } from '../src/server/config';

// ---------------------------------------------------------------------------
// Evidence class markers — fixed constants, never caller supplied.
// ---------------------------------------------------------------------------

export const probeEvidenceClass = 'DIAGNOSTIC';
export const probeDiagnosticMarker =
  'DIAGNOSTIC ONLY — NOT GATE 5 ACCEPTANCE EVIDENCE';
/** Literal false: this probe can never be promoted to Gate 5 evidence. */
export const gate5AcceptanceEvidence = false as const;
export const probeTargetHttpExecutions = 0 as const;

// ---------------------------------------------------------------------------
// Persisted document schemas (allowlisted fields only)
// ---------------------------------------------------------------------------

const ContractIssueSchema =
  ProviderDiagnosticSchema.shape.contractIssues.unwrap().element;

const SampleRecordSchema = z.strictObject({
  fixtureId: z.string().min(1),
  ordinal: z.int().positive(),
  accepted: z.boolean(),
  planningOutcome: z.enum([
    'PROPOSED',
    'MODEL ERROR',
    'MODEL PLAN ERROR',
    'CANCELLED',
  ]),
  failureKind: ProposalFailureKindSchema.optional(),
  diagnosticStage: z
    .enum(['REQUEST', 'RESPONSE_PARSE', 'CONTRACT_VALIDATION'])
    .optional(),
  diagnosticValidationRule: z.string().min(1).optional(),
  sanitizedContractIssues: z.strictObject({
    stage: z
      .enum(['REQUEST', 'RESPONSE_PARSE', 'CONTRACT_VALIDATION'])
      .optional(),
    validationRule: z.string().min(1).optional(),
    contractIssues: z.array(ContractIssueSchema).max(10),
  }),
  providerModel: z.string().min(1),
  configuredRPM: z.int().positive(),
  modelCalls: z.int().nonnegative(),
  elapsedMs: z.int().nonnegative(),
});
export type ProbeSampleRecord = z.infer<typeof SampleRecordSchema>;

const AggregateSchema = z.strictObject({
  requested: z.int().nonnegative(),
  persisted: z.int().nonnegative(),
  accepted: z.int().nonnegative(),
  rejected: z.int().nonnegative(),
  validityRate: z.number().min(0).max(1),
  modelCalls: z.int().nonnegative(),
});

const EvidenceHeaderShape = {
  evidenceClass: z.literal('DIAGNOSTIC'),
  marker: z.literal(probeDiagnosticMarker),
  gate5AcceptanceEvidence: z.literal(false),
  targetHttpExecutions: z.literal(0),
  model: z.string().min(1),
  configuredRPM: z.int().positive(),
  samplesPerFixture: z.int().positive(),
  fixtureIds: z.array(z.string().min(1)).min(1),
} as const;

const ResultsDocumentSchema = z.strictObject({
  ...EvidenceHeaderShape,
  probeId: z.string().min(1),
  results: z.array(SampleRecordSchema).max(100000),
});

const SummaryDocumentSchema = z.strictObject({
  ...EvidenceHeaderShape,
  probeId: z.string().min(1),
  overall: AggregateSchema,
  perFixture: z.record(z.string(), AggregateSchema),
  rejectionsByValidationRule: z.record(z.string(), z.int().nonnegative()),
  rejectionsByContractIssueCode: z.record(z.string(), z.int().nonnegative()),
  rejectionsBySanitizedPath: z.record(z.string(), z.int().nonnegative()),
});

export type ProbeResultsDocument = z.infer<typeof ResultsDocumentSchema>;
export type ProbeSummaryDocument = z.infer<typeof SummaryDocumentSchema>;
export type ProbeAggregate = z.infer<typeof AggregateSchema>;

// ---------------------------------------------------------------------------
// Injection surface
// ---------------------------------------------------------------------------

export interface ProbeFixture {
  /** Neutral public label only. No variant identity or private trigger data. */
  id: string;
  run: Run;
}

export interface ProbeOptions {
  outputDirectory: string;
  fixtures: ProbeFixture[];
  samplesPerFixture: number;
  model: string;
  configuredRequestsPerMinute: number;
  createProvider: () => ReasoningProvider;
  timeoutMs?: number;
  remainingMilliseconds?: number;
  probeId?: string;
  /** Injectable clock so elapsed measurement is deterministic under test. */
  now?: () => number;
}

const defaultTimeoutMs = 30000;
const defaultRemainingMilliseconds = 600000;

// ---------------------------------------------------------------------------
// Aggregation (pure)
// ---------------------------------------------------------------------------

export function aggregateProbeRecords(
  results: ProbeSampleRecord[],
  requested: number,
): ProbeAggregate {
  const accepted = results.filter((r) => r.accepted).length;
  return {
    requested,
    persisted: results.length,
    accepted,
    // Rejected attempts stay in the denominator: validity is accepted/total
    // over every requested sample, never over accepted-only samples.
    rejected: results.length - accepted,
    validityRate: results.length > 0 ? accepted / results.length : 0,
    modelCalls: results.reduce((sum, r) => sum + r.modelCalls, 0),
  };
}

function countRejections(results: ProbeSampleRecord[]): {
  rejectionsByValidationRule: Record<string, number>;
  rejectionsByContractIssueCode: Record<string, number>;
  rejectionsBySanitizedPath: Record<string, number>;
} {
  const byRule: Record<string, number> = {};
  const byCode: Record<string, number> = {};
  const byPath: Record<string, number> = {};
  const bump = (target: Record<string, number>, key: string) => {
    target[key] = (target[key] ?? 0) + 1;
  };
  for (const record of results) {
    if (record.accepted) continue;
    bump(byRule, record.diagnosticValidationRule ?? 'UNKNOWN');
    for (const issue of record.sanitizedContractIssues.contractIssues) {
      bump(byCode, issue.code);
      bump(byPath, JSON.stringify(issue.path));
    }
  }
  return {
    rejectionsByValidationRule: byRule,
    rejectionsByContractIssueCode: byCode,
    rejectionsBySanitizedPath: byPath,
  };
}

// ---------------------------------------------------------------------------
// Durable persistence
// ---------------------------------------------------------------------------

async function writeDurably(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

// ---------------------------------------------------------------------------
// The probe itself
// ---------------------------------------------------------------------------

export async function runProposalValidityProbe(
  options: ProbeOptions,
): Promise<ProbeSummaryDocument> {
  const now = options.now ?? (() => performance.now());
  const probeId = options.probeId ?? randomUUID();
  const samplesPerFixture = z.int().positive().parse(options.samplesPerFixture);
  const configuredRPM = z
    .int()
    .positive()
    .parse(options.configuredRequestsPerMinute);
  const fixtures = z
    .array(z.strictObject({ id: z.string().min(1), run: RunSchema }))
    .min(1)
    .parse(options.fixtures);
  const provider = options.createProvider();
  const header = {
    evidenceClass: probeEvidenceClass,
    marker: probeDiagnosticMarker,
    gate5AcceptanceEvidence,
    targetHttpExecutions: probeTargetHttpExecutions,
    model: options.model,
    configuredRPM,
    samplesPerFixture,
    fixtureIds: fixtures.map((f) => f.id),
  };

  await mkdir(options.outputDirectory, { recursive: true });
  const resultsPath = join(options.outputDirectory, 'results.json');
  const summaryPath = join(options.outputDirectory, 'summary.json');
  const results: ProbeSampleRecord[] = [];

  // Instrumentation only: delegate to the real provider, count dispatches.
  // If requestProposal ever called propose twice, modelCalls would exceed one.
  let calls = 0;
  const counted: ReasoningProvider = {
    identity: provider.identity,
    propose: (context, signal) => {
      calls++;
      return provider.propose(context, signal);
    },
  };

  const persistResults = () =>
    writeDurably(
      resultsPath,
      ResultsDocumentSchema.parse({
        ...header,
        probeId,
        results,
      }),
    );
  await persistResults();

  for (const fixture of fixtures) {
    // One sanitized context per fixture, built exactly as the production engine
    // builds it. It is never revised from rejection outcomes: the probe must not
    // feed validation feedback back to the model.
    const sanitized = buildPlanningContext(
      {
        run: fixture.run,
        mappings: [],
        observations: [],
        symbolicInputs: {},
        // Considered hypotheses are 64-hex canonical journey fingerprints
        // (hypothesisHash), never predicate identifiers. The probe deliberately
        // considers none, so no sample can be biased by an earlier rejection.
        consideredHypothesisHashes: [],
      },
      new SecretVault(),
    );

    for (let ordinal = 1; ordinal <= samplesPerFixture; ordinal++) {
      const before = calls;
      const started = now();
      let accepted = false;
      let planningOutcome: ProbeSampleRecord['planningOutcome'] = 'MODEL ERROR';
      let failureKind: ProbeSampleRecord['failureKind'];
      let diagnostic: z.infer<typeof ProviderDiagnosticSchema> | undefined;

      try {
        await requestProposal({
          provider: counted,
          context: sanitized,
          api: fixture.run.apiSnapshot,
          scope: fixture.run.scope,
          model: options.model,
          signal: new AbortController().signal,
          timeoutMs: options.timeoutMs ?? defaultTimeoutMs,
          remainingMilliseconds:
            options.remainingMilliseconds ?? defaultRemainingMilliseconds,
        });
        accepted = true;
        planningOutcome = 'PROPOSED';
      } catch (error) {
        if (!(error instanceof PlanningError)) {
          // Unexpected probe/harness failure. Completed evidence is already
          // durable on disk; never swallow it into a sample record.
          throw error;
        }
        planningOutcome = error.telemetry.outcome;
        failureKind = error.telemetry.failureKind;
        const safe = ProviderDiagnosticSchema.safeParse(
          error.telemetry.diagnostic,
        );
        if (safe.success) diagnostic = safe.data;
      }

      const modelCalls = calls - before;
      results.push(
        SampleRecordSchema.parse({
          fixtureId: fixture.id,
          ordinal,
          accepted,
          planningOutcome,
          ...(failureKind === undefined ? {} : { failureKind }),
          ...(diagnostic?.stage === undefined
            ? {}
            : { diagnosticStage: diagnostic.stage }),
          ...(diagnostic?.validationRule === undefined
            ? {}
            : { diagnosticValidationRule: diagnostic.validationRule }),
          // Only the production-sanitized diagnostic shape is retained: never
          // raw model output, exception text, messages, bodies or URLs.
          sanitizedContractIssues: {
            ...(diagnostic?.stage === undefined
              ? {}
              : { stage: diagnostic.stage }),
            ...(diagnostic?.validationRule === undefined
              ? {}
              : { validationRule: diagnostic.validationRule }),
            contractIssues: diagnostic?.contractIssues ?? [],
          },
          providerModel: provider.identity?.model ?? options.model,
          configuredRPM,
          modelCalls,
          elapsedMs: Math.max(0, Math.round(now() - started)),
        }),
      );
      await persistResults();
    }
  }

  const overall = aggregateProbeRecords(
    results,
    fixtures.length * samplesPerFixture,
  );
  const perFixture: Record<string, ProbeAggregate> = {};
  for (const fixture of fixtures) {
    const scoped = results.filter((r) => r.fixtureId === fixture.id);
    perFixture[fixture.id] = aggregateProbeRecords(scoped, samplesPerFixture);
  }
  const summary = SummaryDocumentSchema.parse({
    ...header,
    probeId,
    overall,
    perFixture,
    ...countRejections(results),
  });
  await writeDurably(summaryPath, summary);
  return summary;
}

// ---------------------------------------------------------------------------
// CLI entry (kept separate so importing this module has no side effects)
// ---------------------------------------------------------------------------

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function main(argv: string[]): Promise<ProbeSummaryDocument> {
  // Neutral contract fixtures: exploration-eligible operations only. No faulty or
  // repaired identity, no seeded trigger metadata, no evaluator-private data.
  const { planningFixture } = await import('../tests/helpers/planning');
  const equals = argv.find((a) => a.startsWith('--samples-per-fixture='));
  const flag = argv.indexOf('--samples-per-fixture');
  const samplesPerFixture =
    parsePositiveInteger(flag >= 0 ? argv[flag + 1] : equals?.split('=')[1]) ??
    10;
  const outputIndex = argv.findIndex((a) => a === '--output');
  const outputDirectory =
    outputIndex >= 0 && argv[outputIndex + 1]
      ? resolvePath(argv[outputIndex + 1]!)
      : resolvePath('tests/diagnostics/proposal-validity');

  loadLocalEnvironment();
  const config = readConfig(process.env);
  const rpm = config.geminiRequestsPerMinute;
  const pacer = createModelPacer(rpm);

  const fixtureIds = ['order-lifecycle', 'inventory', 'workflow'] as const;
  const fixtures: ProbeFixture[] = fixtureIds.map((id) => ({
    id,
    run: planningFixture().run,
  }));

  const summary = await runProposalValidityProbe({
    outputDirectory,
    fixtures,
    samplesPerFixture,
    model: config.geminiModel,
    configuredRequestsPerMinute: rpm,
    createProvider: () =>
      createGeminiProvider(
        {
          model: config.geminiModel,
          apiKey: config.geminiApiKey,
          requestsPerMinute: rpm,
        },
        undefined,
        pacer,
      ),
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        marker: probeDiagnosticMarker,
        gate5AcceptanceEvidence,
        targetHttpExecutions: probeTargetHttpExecutions,
        overall: summary.overall,
        perFixture: summary.perFixture,
        outputDirectory,
      },
      null,
      2,
    )}\n`,
  );
  return summary;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolvePath(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main(process.argv.slice(2))
    .then(() => undefined)
    .catch(() => {
      // Never echo exception text: it may carry model or provider payloads.
      process.stderr.write(`${probeDiagnosticMarker}\nPROBE FAILED\n`);
      process.exitCode = 1;
    });
}
