/**
 * proposal-validity-probe.test.ts
 *
 * Deterministic tests proving the proposal-validity probe satisfies all
 * measurement and safety properties. These tests MUST NOT consume Gemini quota
 * and MUST NOT execute target APIs: the only provider is a local fake and the
 * only network surface is a counting loopback server that must see zero
 * requests.
 *
 * Fake replies reuse the repository helper `reply()` exactly as the passing
 * planning tests do, so the production `requestProposal` identity check,
 * `ReplySchema`, `unpackProposal` and `validateJourney` all run for real.
 */

import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { RequestListener } from 'node:http';
import type { Run } from '../../src/engine/contracts';
import type { ReasoningProvider } from '../../src/engine/planning/provider';
import { makeRun } from '../helpers/run';
import { planningFixture, reply } from '../helpers/planning';
import { targetServer } from '../helpers/target-server';
import {
  aggregateProbeRecords,
  gate5AcceptanceEvidence,
  probeDiagnosticMarker,
  probeTargetHttpExecutions,
  runProposalValidityProbe,
  type ProbeResultsDocument,
  type ProbeSampleRecord,
  type ProbeSummaryDocument,
} from '../../scripts/proposal-validity-probe';

// Identity of the repository `reply()` helper: model must match, or production
// rejects with PROVIDER IDENTITY and nothing else is exercised.
const model = 'configured-model';
const provider = 'mock-provider';

const rawModelSecret = 'RAW-MODEL-OUTPUT-SECRET';
const apiKeySecret = 'AIzaSy-PROVIDER-KEY-SECRET';
const exceptionSecret = 'EXCEPTION-TEXT-SECRET';
const lateFailureSecret = 'SIMULATED-LATE-FAILURE-SECRET';
const privateMetadata = [
  'PRIVATE-EVALUATOR-DATA',
  'PRIVATE-TRIGGER-SEQUENCE',
  'PRIVATE-RESET-CONTROL',
];

const fixtureIds = ['order-lifecycle', 'inventory', 'workflow'];

let requests: string[] = [];
let server: Awaited<ReturnType<typeof targetServer>>;

beforeAll(async () => {
  const listener: RequestListener = (incoming, response) => {
    requests.push(`${incoming.method} ${incoming.url}`);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{}');
  };
  server = await targetServer(listener);
});

afterAll(async () => {
  await server.close();
});

// ---------------------------------------------------------------------------
// Fixtures and fakes
// ---------------------------------------------------------------------------

/**
 * Neutral planning contract whose frozen scope points at the counting loopback
 * server, so any real target dispatch would be observable rather than merely
 * unobserved. Evaluator-private metadata is attached so its absence from
 * persisted evidence can be asserted.
 */
function probeRun(): Run {
  const run = makeRun(randomUUID(), server.port);
  run.modelConfiguration = { model, fixtureMetadata: privateMetadata[0]! };
  run.apiSnapshot = {
    ...run.apiSnapshot,
    importDiagnostics: [{ variant: 'faulty', seed: privateMetadata[1]! }],
    operations: run.apiSnapshot.operations.map((operation) =>
      operation.id === 'POST /api/reset'
        ? { ...operation, sanitizedDescription: privateMetadata[2]! }
        : operation,
    ),
  };
  return run;
}

/** A journey whose predicateRef matches the fixture run it will be judged against. */
function journeyFor(run: Run) {
  const predicate = run.predicates[0]!;
  return {
    ...planningFixture().journey,
    predicateRef: {
      id: predicate.id,
      version: predicate.version,
      hash: predicate.canonicalHash,
    },
  };
}

function validProposal(run: Run) {
  return { journey: journeyFor(run), mappings: [], hypotheses: [] };
}

/**
 * Schema-valid envelope, contract-invalid content: strict schemas reject an
 * unexpected journey-step key and an unexpected proposal key, producing
 * sanitized `unrecognized_keys` issues with real paths.
 */
function overStrictProposal(run: Run) {
  const journey = journeyFor(run);
  return {
    journey: {
      ...journey,
      steps: [{ ...journey.steps[0]!, injectedControl: rawModelSecret }],
    },
    mappings: [],
    hypotheses: [],
    leakedModelProse: apiKeySecret,
  };
}

/** Schema-valid but semantically invalid step: rejected by production journey validation. */
function semanticallyInvalidProposal(run: Run) {
  const journey = journeyFor(run);
  journey.steps[0]!.parameters.push({
    location: 'query',
    name: 'invented',
    value: { kind: 'literal', value: 'x' },
  });
  return { journey, mappings: [], hypotheses: [] };
}

/**
 * Local fake provider. `plan` receives the running call ordinal and either
 * returns a proposal envelope or throws to simulate a provider failure. Calls
 * and the exact context handed to the model are recorded for assertions.
 */
function scriptedProvider(
  plan: (ordinal: number, run: Run) => unknown,
  sink: { calls: number; contexts: unknown[]; run: Run },
): ReasoningProvider {
  return {
    identity: { provider, model },
    propose: async (context) => {
      sink.calls++;
      sink.contexts.push(context);
      const proposal = plan(sink.calls, sink.run);
      if (proposal instanceof Error) throw proposal;
      return reply(proposal);
    },
  };
}

type Sink = { calls: number; contexts: unknown[]; run: Run };

async function temporaryDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ghostqa-probe-'));
}

/** Deterministic monotonic clock: 5ms per reading, no real waiting. */
function deterministicClock() {
  let tick = 0;
  return () => (tick += 5);
}

async function runProbe(options: {
  samplesPerFixture: number;
  plan: (ordinal: number, run: Run) => unknown;
  ids?: string[];
  now?: () => number;
}) {
  const outputDirectory = await temporaryDirectory();
  const ids = options.ids ?? fixtureIds;
  const sink: Sink = { calls: 0, contexts: [], run: probeRun() };
  // One shared neutral run across fixture labels: every fixture proposes against
  // the same eligible predicate contract, so grouping stays about measurement.
  const summary = await runProposalValidityProbe({
    outputDirectory,
    fixtures: ids.map((id) => ({ id, run: sink.run })),
    samplesPerFixture: options.samplesPerFixture,
    model,
    configuredRequestsPerMinute: 12,
    createProvider: () => scriptedProvider(options.plan, sink),
    probeId: randomUUID(),
    now: options.now ?? deterministicClock(),
  });
  const results = JSON.parse(
    await readFile(join(outputDirectory, 'results.json'), 'utf8'),
  ) as ProbeResultsDocument;
  const persistedSummary = JSON.parse(
    await readFile(join(outputDirectory, 'summary.json'), 'utf8'),
  ) as ProbeSummaryDocument;
  return { summary, persistedSummary, results, sink, outputDirectory };
}

// ---------------------------------------------------------------------------

describe('proposal validity probe measurement', () => {
  test('exactly N requested samples produce exactly N model calls, never a second call after rejection', async () => {
    const samplesPerFixture = 3;
    const { results, persistedSummary, sink } = await runProbe({
      samplesPerFixture,
      plan: (ordinal, run) =>
        ordinal % 2 === 0 ? overStrictProposal(run) : validProposal(run),
    });
    const expected = fixtureIds.length * samplesPerFixture;

    // One provider call per requested sample: no retry, no skip.
    expect(sink.calls).toBe(expected);
    expect(results.results).toHaveLength(expected);
    expect(persistedSummary.overall.requested).toBe(expected);
    expect(persistedSummary.overall.modelCalls).toBe(expected);
    // Per-sample attribution proves no sample issued a second model call.
    for (const record of results.results) expect(record.modelCalls).toBe(1);
    for (const id of fixtureIds) {
      const scoped = results.results.filter((r) => r.fixtureId === id);
      expect(scoped.map((r) => r.ordinal).sort((a, b) => a - b)).toEqual([
        1, 2, 3,
      ]);
    }
  });

  test('production requestProposal validation decides accepted and drives failure classification', async () => {
    const { results } = await runProbe({
      samplesPerFixture: 3,
      plan: (ordinal, run) => {
        if (ordinal === 1) return validProposal(run);
        if (ordinal === 2) return overStrictProposal(run);
        return semanticallyInvalidProposal(run);
      },
    });

    const [accepted, strict, semantic] = results.results as [
      ProbeSampleRecord,
      ProbeSampleRecord,
      ProbeSampleRecord,
    ];

    expect(accepted!.accepted).toBe(true);
    expect(accepted!.planningOutcome).toBe('PROPOSED');
    expect(accepted!.failureKind).toBeUndefined();

    // Rejections carry production-derived failure kinds and validation rules.
    expect(strict!.accepted).toBe(false);
    expect(strict!.planningOutcome).toBe('MODEL PLAN ERROR');
    expect(strict!.failureKind).toBe('CONTRACT_VALIDATION');
    expect(strict!.diagnosticValidationRule).toBe('PROPOSAL SCHEMA');

    expect(semantic!.accepted).toBe(false);
    expect(semantic!.failureKind).toBe('CONTRACT_VALIDATION');
    expect(semantic!.diagnosticValidationRule).toBe('UNKNOWN PARAMETER');

    // Accepted classification required a journey whose predicate reference is
    // eligible in the supplied context, not a stub.
    expect(accepted!.sanitizedContractIssues.contractIssues).toEqual([]);
  });

  test('rejected attempts remain in the denominator and aggregates match persisted records', async () => {
    const samplesPerFixture = 4;
    const { results, persistedSummary } = await runProbe({
      samplesPerFixture,
      plan: (ordinal, run) =>
        ordinal % 3 === 0 ? overStrictProposal(run) : validProposal(run),
    });

    const persisted = results.results;
    const rejected = persisted.filter((r) => !r.accepted);
    expect(rejected.length).toBeGreaterThan(0);
    const requested = fixtureIds.length * samplesPerFixture;

    expect(persistedSummary.overall.requested).toBe(requested);
    expect(persistedSummary.overall.persisted).toBe(persisted.length);
    expect(persistedSummary.overall.rejected).toBe(rejected.length);
    expect(
      persistedSummary.overall.accepted + persistedSummary.overall.rejected,
    ).toBe(requested);
    // Validity is accepted/total over every requested sample, not accepted-only.
    expect(persistedSummary.overall.validityRate).toBeLessThan(1);
    expect(persistedSummary.overall.validityRate).toBe(
      persistedSummary.overall.accepted / persistedSummary.overall.persisted,
    );
    // Re-deriving the aggregates from the persisted file reproduces the summary.
    expect(aggregateProbeRecords(persisted, requested)).toEqual(
      persistedSummary.overall,
    );
    for (const id of fixtureIds) {
      const scoped = persisted.filter((r) => r.fixtureId === id);
      expect(scoped).toHaveLength(samplesPerFixture);
      expect(persistedSummary.perFixture[id]).toEqual(
        aggregateProbeRecords(scoped, samplesPerFixture),
      );
    }
    const perFixtureTotal = Object.values(persistedSummary.perFixture).reduce(
      (sum, aggregate) => sum + aggregate.persisted,
      0,
    );
    expect(perFixtureTotal).toBe(persisted.length);
  });

  test('validationRule, contract issue code and sanitized path survive persistence', async () => {
    const { results, persistedSummary } = await runProbe({
      samplesPerFixture: 3,
      plan: (ordinal, run) =>
        ordinal === 1 ? overStrictProposal(run) : validProposal(run),
    });

    const rejected = results.results.filter((r) => !r.accepted);
    expect(rejected.length).toBeGreaterThan(0);
    for (const record of rejected) {
      expect(record.diagnosticStage).toBe('CONTRACT_VALIDATION');
      expect(record.diagnosticValidationRule).toBe('PROPOSAL SCHEMA');
      expect(record.sanitizedContractIssues.stage).toBe('CONTRACT_VALIDATION');
      expect(record.sanitizedContractIssues.validationRule).toBe(
        'PROPOSAL SCHEMA',
      );
      const codes = record.sanitizedContractIssues.contractIssues.map(
        (issue) => issue.code,
      );
      expect(codes).toContain('unrecognized_keys');
    }

    // A nested rejection keeps its structural path, sanitized to allowlisted
    // keys and indices.
    const nested = rejected.find((r) =>
      r.sanitizedContractIssues.contractIssues.some((issue) =>
        issue.path.includes('journey'),
      ),
    );
    expect(nested).toBeDefined();
    const issue = nested!.sanitizedContractIssues.contractIssues.find((i) =>
      i.path.includes('journey'),
    )!;
    expect(issue.code).toBe('unrecognized_keys');
    expect(issue.path).toEqual(['journey', 'steps', 0]);

    // Aggregated rule/code/path breakdowns agree with the persisted records.
    expect(persistedSummary.rejectionsByValidationRule['PROPOSAL SCHEMA']).toBe(
      rejected.length,
    );
    expect(
      persistedSummary.rejectionsByContractIssueCode.unrecognized_keys,
    ).toBe(
      rejected.reduce(
        (sum, r) =>
          sum +
          r.sanitizedContractIssues.contractIssues.filter(
            (i) => i.code === 'unrecognized_keys',
          ).length,
        0,
      ),
    );
    expect(
      persistedSummary.rejectionsBySanitizedPath[
        JSON.stringify(['journey', 'steps', 0])
      ],
    ).toBeGreaterThan(0);
    for (const path of Object.keys(
      persistedSummary.rejectionsBySanitizedPath,
    )) {
      expect(() => JSON.parse(path)).not.toThrow();
    }
  });

  test('persisted evidence is diagnostic-only, never Gate 5 evidence, and records configured RPM', async () => {
    const { results, persistedSummary } = await runProbe({
      samplesPerFixture: 2,
      plan: (_ordinal, run) => validProposal(run),
    });

    for (const document of [results, persistedSummary] as unknown[]) {
      expect(document).toMatchObject({
        evidenceClass: 'DIAGNOSTIC',
        marker: probeDiagnosticMarker,
        gate5AcceptanceEvidence: false,
        targetHttpExecutions: 0,
      });
    }
    expect(gate5AcceptanceEvidence).toBe(false);
    expect(probeTargetHttpExecutions).toBe(0);
    expect(results.probeId).toBe(persistedSummary.probeId);

    expect(persistedSummary.configuredRPM).toBe(12);
    for (const record of results.results) {
      expect(record.configuredRPM).toBe(12);
      expect(record.providerModel).toBe(model);
      expect(record.elapsedMs).toBeGreaterThanOrEqual(0);
    }
    expect(Object.keys(persistedSummary.perFixture).sort()).toEqual(
      [...fixtureIds].sort(),
    );
  });

  test('no raw model output, exception text, API keys or evaluator-private metadata is persisted', async () => {
    const outputDirectory = await temporaryDirectory();
    const run = probeRun();
    const sink: Sink = { calls: 0, contexts: [], run };
    await runProposalValidityProbe({
      outputDirectory,
      fixtures: fixtureIds.map((id) => ({ id, run })),
      samplesPerFixture: 4,
      model,
      configuredRequestsPerMinute: 12,
      createProvider: () =>
        scriptedProvider((ordinal, current) => {
          const kind = ordinal % 4;
          if (kind === 1) return overStrictProposal(current);
          if (kind === 2) throw new Error(`${exceptionSecret} ${apiKeySecret}`);
          if (kind === 3) return semanticallyInvalidProposal(current);
          return validProposal(current);
        }, sink),
      probeId: randomUUID(),
      now: deterministicClock(),
    });

    const combined = (
      await Promise.all(
        ['results.json', 'summary.json'].map((name) =>
          readFile(join(outputDirectory, name), 'utf8'),
        ),
      )
    ).join('\n');
    expect(combined.length).toBeGreaterThan(0);
    for (const forbidden of [
      rawModelSecret,
      apiKeySecret,
      exceptionSecret,
      'leakedModelProse',
      'injectedControl',
      'faulty',
      'fixtureMetadata',
      'authorization',
      'apiKey',
      ...privateMetadata,
    ]) {
      expect(combined).not.toContain(forbidden);
    }

    // The provider failure is still recorded, as an allowlisted outcome only.
    const persisted = JSON.parse(
      await readFile(join(outputDirectory, 'results.json'), 'utf8'),
    ) as ProbeResultsDocument;
    expect(persisted.results).toHaveLength(12);
    expect(persisted.results.filter((r) => !r.accepted).length).toBe(9);
    const failed = persisted.results.find(
      (r) => r.failureKind === 'PROVIDER_EXCEPTION',
    );
    expect(failed).toBeDefined();
    expect(failed!.planningOutcome).toBe('MODEL ERROR');
    expect(failed!.modelCalls).toBe(1);
  });

  test('no validation feedback is sent back to the model across samples', async () => {
    const { sink } = await runProbe({
      samplesPerFixture: 4,
      ids: ['order-lifecycle'],
      plan: (ordinal, run) =>
        ordinal === 2 ? overStrictProposal(run) : validProposal(run),
    });

    expect(sink.calls).toBe(4);
    // Every model request receives an identical context: a rejection never
    // revises what the model sees.
    const [first, ...rest] = sink.contexts;
    for (const context of rest) {
      expect(JSON.stringify(context)).toBe(JSON.stringify(first));
    }
    const context = first as { consideredHypothesisHashes: string[] };
    expect(context.consideredHypothesisHashes).toEqual([]);
    expect(
      context.consideredHypothesisHashes.every((h) => /^[a-f0-9]{64}$/.test(h)),
    ).toBe(true);
  });

  test('completed evidence survives a later simulated failure', async () => {
    const outputDirectory = await temporaryDirectory();
    const run = probeRun();
    const sink: Sink = { calls: 0, contexts: [], run };
    let readings = 0;
    // Two samples complete (two clock readings each), then the run fails.
    const failingClock = () => {
      readings++;
      if (readings > 4) throw new Error(lateFailureSecret);
      return readings * 5;
    };

    await expect(
      runProposalValidityProbe({
        outputDirectory,
        fixtures: fixtureIds.map((id) => ({ id, run })),
        samplesPerFixture: 3,
        model,
        configuredRequestsPerMinute: 12,
        createProvider: () =>
          scriptedProvider((_ordinal, current) => validProposal(current), sink),
        probeId: randomUUID(),
        now: failingClock,
      }),
    ).rejects.toThrow();

    // Completed samples remain durable, parseable and diagnostic-marked.
    const raw = await readFile(join(outputDirectory, 'results.json'), 'utf8');
    const persisted = JSON.parse(raw) as ProbeResultsDocument;
    expect(persisted.results).toHaveLength(2);
    expect(persisted.results.every((r) => r.accepted)).toBe(true);
    expect(
      persisted.results.every((r) => r.fixtureId === 'order-lifecycle'),
    ).toBe(true);
    expect(persisted.marker).toBe(probeDiagnosticMarker);
    expect(persisted.gate5AcceptanceEvidence).toBe(false);
    expect(persisted.results.map((r) => r.ordinal)).toEqual([1, 2]);
    expect(raw).not.toContain(lateFailureSecret);
    // No summary is claimed for an incomplete run.
    await expect(
      readFile(join(outputDirectory, 'summary.json'), 'utf8'),
    ).rejects.toThrow();
    expect(sink.calls).toBe(2);
  });

  test('every persisted record has exactly the allowlisted field set', async () => {
    const { results } = await runProbe({
      samplesPerFixture: 2,
      plan: (ordinal, run) =>
        ordinal === 1 ? validProposal(run) : overStrictProposal(run),
    });
    const allowed = new Set([
      'accepted',
      'configuredRPM',
      'diagnosticStage',
      'diagnosticValidationRule',
      'elapsedMs',
      'failureKind',
      'fixtureId',
      'modelCalls',
      'ordinal',
      'planningOutcome',
      'providerModel',
      'sanitizedContractIssues',
    ]);
    expect(results.results.length).toBeGreaterThan(0);
    let rejectedRecords = 0;
    for (const record of results.results) {
      // Only allowlisted fields may survive persistence, never more.
      expect(Object.keys(record).every((key) => allowed.has(key))).toBe(true);
      expect(Object.keys(record.sanitizedContractIssues).sort()).toEqual(
        ['contractIssues', 'stage', 'validationRule'].filter(
          (key) => key in record.sanitizedContractIssues,
        ),
      );
      if (!record.accepted) {
        rejectedRecords++;
        expect(record.failureKind).toBeDefined();
        expect(record.diagnosticValidationRule).toBeDefined();
      }
    }
    // The optional diagnostic fields are exercised, not merely permitted.
    expect(rejectedRecords).toBeGreaterThan(0);
    expect(
      results.results.some((r) => r.diagnosticStage === 'CONTRACT_VALIDATION'),
    ).toBe(true);
    expect(results.results.some((r) => r.failureKind === undefined)).toBe(true);
  });
});

describe('proposal validity probe never executes target APIs', () => {
  test('zero target HTTP requests reach the frozen-scope origin', async () => {
    requests = [];
    const { sink, results } = await runProbe({
      samplesPerFixture: 3,
      plan: (ordinal, run) =>
        ordinal % 2 === 1 ? validProposal(run) : overStrictProposal(run),
    });
    expect(sink.calls).toBe(9);
    expect(results.results).toHaveLength(9);
    expect(requests).toEqual([]);
    expect(results.targetHttpExecutions).toBe(0);
    expect(results.results.every((r) => r.accepted || !r.accepted)).toBe(true);
  });

  test('probe module holds no target transport, dispatcher or fetch surface', async () => {
    const source = await readFile(
      new URL('../../scripts/proposal-validity-probe.ts', import.meta.url),
      'utf8',
    );
    for (const forbidden of [
      'transport/http',
      'http-executor',
      'run-supervisor',
      'single-dispatch',
      'fresh-state',
      'undici',
      'node:https',
      'http.request',
      'https.request',
      'fetch(',
      'createPinnedHttpTransport',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  test('probe module executes nothing on import', async () => {
    const source = await readFile(
      new URL('../../scripts/proposal-validity-probe.ts', import.meta.url),
      'utf8',
    );
    // Importing the module must not read configuration or start the probe.
    expect(source).toContain('invokedDirectly');
    const entry = source.indexOf('if (invokedDirectly)');
    expect(entry).toBeGreaterThan(0);
    expect(source.indexOf('loadLocalEnvironment()')).toBeGreaterThan(0);
    expect(source.indexOf('loadLocalEnvironment()')).toBeLessThan(entry);
  });
});
