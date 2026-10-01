import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterAll, expect, test } from 'vitest';
import { loadRequiredSuite } from '../../fixtures/required';
import {
  requiredArtifact,
  originatingState,
} from '../helpers/required-artifact';
import { canonical } from '../../src/engine/detection/predicate';
import { createRegressionBundle } from '../../src/engine/exports/bundle';
import { verifyArtifact } from '../../src/engine/exports/verify';
import {
  requiredOperations,
  type Invocation,
  type runRegression,
} from '../../src/engine/exports/runner';
import { manifestHash } from '../../src/engine/exports/manifest-integrity';
import type { GeneratedExport } from '../../src/engine/exports/contracts';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const observed: {
  context: 'INDEPENDENT' | 'SUPERVISED_RUN_PATH';
  fixtureId: string;
  variant: string;
  repetition: number;
  runId: string;
  manifestHash: string;
  packageHash?: string;
  trialId: string;
  baselineId: string;
  result: string;
  verdict: string;
  artifactStatus?: string;
  requests: number;
  requestLimit: number;
  originatingEvidenceUnchanged?: boolean;
  predicateRef: GeneratedExport['manifest']['predicateRef'];
  evidenceId?: string;
}[] = [];
const packageOrigins: {
  fixtureId: string;
  runId: string;
  manifestHash: string;
  packageHash: string;
  verification: string;
  verdict: string;
  trialId: string;
  baselineId: string;
  evidenceId: string;
  requests: number;
  requestLimit: number;
}[] = [];
const packageSources: {
  fixtureId: string;
  generated: GeneratedExport;
  runnerHash: string;
  packageHash: string;
  originBeforeHash: string;
  originAfterIndependentHash: string;
  initial: Awaited<ReturnType<typeof requiredArtifact>>['initial'];
  replay: Awaited<ReturnType<typeof requiredArtifact>>['replay'];
  supervised: Awaited<ReturnType<typeof verifyArtifact>>;
}[] = [];
const supervisedSources: {
  fixtureId: string;
  variant: string;
  repetition: number;
  generated: GeneratedExport;
  initial: Awaited<ReturnType<typeof requiredArtifact>>['initial'];
  replay: Awaited<ReturnType<typeof requiredArtifact>>['replay'];
  result: Awaited<ReturnType<typeof verifyArtifact>>;
}[] = [];
const suite = await loadRequiredSuite();
function invocation(
  m: GeneratedExport['manifest'],
  target: string,
  requests = 5,
): Invocation {
  return {
    target: target + '/api',
    addresses: [{ ip: '127.0.0.1', family: 4 }],
    approvedOperations: requiredOperations(m),
    mutationsAcknowledged: true,
    budget: { requests, milliseconds: 10000, requestTimeoutMs: 1000 },
    credentials: {},
    inputs: {},
  };
}
for (const entry of suite.fixtures) {
  test(`${entry.id}: same fixed exported package fails faulty 3/3 and passes repaired 3/3 without originating writes`, async () => {
    const h = await requiredArtifact(entry),
      dir = await mkdtemp(join(tmpdir(), 'ghostqa-t047-package-'));
    try {
      const m = h.generated.manifest,
        identity = manifestHash(m),
        bundle = await createRegressionBundle(m, identity);
      expect(bundle.inputs.join('\n')).not.toMatch(
        /http-executor|src\/server\/|planning\/|node_modules\/(?:pg|@google)\//,
      );
      const path = join(dir, 'regression.mjs');
      await writeFile(path, bundle.code);
      expect(hash(await readFile(path, 'utf8'))).toBe(bundle.runnerHash);
      const fixed: unknown = await import(pathToFileURL(path).href);
      if (
        !fixed ||
        typeof fixed !== 'object' ||
        !('manifestHash' in fixed) ||
        !('runStandalone' in fixed) ||
        typeof fixed.runStandalone !== 'function'
      )
        throw Error('FIXED PACKAGE INVALID');
      expect(fixed.manifestHash).toBe(identity);
      const run = fixed.runStandalone as (
        i: Invocation,
        signal?: AbortSignal,
      ) => ReturnType<typeof runRegression>;
      const baselineIds = new Set<string>(),
        trialIds = new Set<string>(),
        before = canonical(await originatingState(h.client)),
        source = canonical(h.generated);
      for (const repaired of [false, true]) {
        if (repaired) await h.variant(true);
        for (let repetition = 1; repetition <= 3; repetition++) {
          const result = await run(invocation(m, h.fixture.url));
          expect(result.context).toBe('INDEPENDENT');
          expect(result.result).toBe(repaired ? 'PASS' : 'FAIL');
          if (
            !result.verdict ||
            !result.baseline ||
            !result.evaluations ||
            !result.predicateRef
          )
            throw Error('ASSERTION EVIDENCE REQUIRED');
          expect(result.verdict).toBe(repaired ? 'SATISFIED' : 'VIOLATED');
          expect(result.predicateRef).toEqual(m.predicateRef);
          expect(result.manifestHash).toBe(identity);
          expect(result.baseline.outcome).toBe('SATISFIED');
          expect(result.usedRequests).toBe(5);
          expect(result).not.toHaveProperty('artifact');
          expect(result).not.toHaveProperty('verification');
          expect(result.evaluations.map((e) => e.assertionId)).toContain(
            `${m.predicateRef.id}:${m.predicateRef.version}:${m.predicateRef.hash}:assertion:0`,
          );
          trialIds.add(result.trialId);
          baselineIds.add(result.baseline.id);
          expect(canonical(await originatingState(h.client))).toBe(before);
          expect(canonical(h.generated)).toBe(source);
          expect(h.generated.artifact.verification).toBe('UNVERIFIED');
          observed.push({
            context: 'INDEPENDENT',
            fixtureId: entry.id,
            variant: repaired ? 'repaired' : 'faulty',
            repetition,
            runId: h.run.id,
            manifestHash: identity,
            packageHash: bundle.packageHash,
            trialId: result.trialId,
            baselineId: result.baseline.id,
            result: result.result,
            verdict: result.verdict,
            requests: result.usedRequests,
            requestLimit: 5,
            originatingEvidenceUnchanged: true,
            predicateRef: m.predicateRef,
          });
        }
      }
      expect(trialIds.size).toBe(6);
      expect(baselineIds.size).toBe(6);
      // The SAME compiled package also fails closed on insufficient budget and cancellation.
      const budget = await run(invocation(m, h.fixture.url, 4));
      expect(budget.result).toBe('ERROR');
      expect(budget.reason).toBe('BUDGET EXHAUSTED');
      expect(budget.usedRequests).toBe(0);
      const cancelled = new AbortController();
      cancelled.abort();
      const cancellation = await run(
        invocation(m, h.fixture.url),
        cancelled.signal,
      );
      expect(cancellation.result).toBe('ERROR');
      expect(cancellation.reason).toBe('CANCELLED');
      expect(canonical(await originatingState(h.client))).toBe(before);
      expect(hash(await readFile(path, 'utf8'))).toBe(bundle.runnerHash);
      // Only the originating supervised path can verify this exact paired package's manifest.
      const independentHash = hash(canonical(await originatingState(h.client)));
      await h.variant(false);
      const verified = await verifyArtifact(h.s, h.s.snapshot, h.generated);
      expect(verified.artifact.verification).toBe('VERIFIED');
      expect(verified.artifact.manifestHash).toBe(identity);
      expect(verified.provenance?.authority).toBe('SUPERVISED_RUN_PATH');
      if (!verified.evidence || !verified.baseline)
        throw Error('PACKAGE ORIGIN VERIFICATION REQUIRED');
      expect(verified.evidence.outcome).toBe('VIOLATED');
      expect(h.s.snapshot.budget.usedRequests).toBe(15);
      packageSources.push({
        fixtureId: entry.id,
        generated: h.generated,
        runnerHash: bundle.runnerHash,
        packageHash: bundle.packageHash,
        originBeforeHash: hash(before),
        originAfterIndependentHash: independentHash,
        initial: h.initial,
        replay: h.replay,
        supervised: verified,
      });
      packageOrigins.push({
        fixtureId: entry.id,
        runId: h.run.id,
        manifestHash: identity,
        packageHash: bundle.packageHash,
        verification: verified.artifact.verification,
        verdict: verified.evidence.outcome,
        trialId: verified.evidence.trialId,
        baselineId: verified.baseline.id,
        evidenceId: verified.evidence.id,
        requests: 15,
        requestLimit: 15,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
      await h.close();
    }
  });
  for (const repaired of [false, true])
    for (let repetition = 1; repetition <= 3; repetition++)
      test(`${entry.id}: fresh supervised exact-manifest acceptance ${repaired ? 'repaired' : 'faulty'} ${repetition}/3`, async () => {
        const h = await requiredArtifact(entry);
        try {
          if (repaired) await h.variant(true);
          const before = await originatingState(h.client),
            source = canonical(h.generated),
            used = h.s.snapshot.budget.usedRequests;
          expect(used).toBe(10);
          expect(h.s.snapshot.budget.limits.requests).toBe(15);
          const result = await verifyArtifact(h.s, h.s.snapshot, h.generated);
          expect(result.artifact.verification).toBe(
            repaired ? 'UNVERIFIED' : 'VERIFIED',
          );
          expect(result.persistence).toBe('RECORDED');
          if (!result.evidence || !result.baseline)
            throw Error('SUPERVISED EVIDENCE REQUIRED');
          expect(result.evidence.outcome).toBe(
            repaired ? 'SATISFIED' : 'VIOLATED',
          );
          expect(result.evidence.predicateRef).toEqual(
            h.generated.manifest.predicateRef,
          );
          expect(result.artifact.manifestHash).toBe(
            manifestHash(h.generated.manifest),
          );
          expect(result.baseline.verdict).toBe('SATISFIED');
          expect(result.baseline.id).not.toBe(h.initial.baseline.id);
          expect(result.baseline.id).not.toBe(h.replay.baseline.id);
          expect(result.evidence.trialId).not.toBe(h.initial.evidence.trialId);
          expect(result.evidence.trialId).not.toBe(h.replay.evidence.trialId);
          expect(h.s.snapshot.budget.usedRequests).toBe(15);
          expect(h.s.snapshot.budget.requestsByPhase).toEqual({
            RESET: 3,
            BASELINE: 3,
            EXPLORATION: 3,
            REPLAY: 3,
            MINIMIZATION: 0,
            ARTIFACT: 3,
          });
          expect(canonical(h.generated)).toBe(source);
          const after = await originatingState(h.client);
          for (const table of [
            'evidence',
            'journeys',
            'step_records',
            'observations',
            'findings',
            'finding_transitions',
            'predicates',
          ] as const)
            for (const row of before[table]!)
              expect(
                after[table]!.some(
                  (next) => canonical(next) === canonical(row),
                ),
              ).toBe(true);
          const stored = await h.client.query(
            'SELECT verification_status,content_hash FROM artifacts WHERE id=$1',
            [h.generated.artifact.id],
          );
          expect(stored.rows[0].verification_status).toBe(
            repaired ? 'UNVERIFIED' : 'VERIFIED',
          );
          expect(stored.rows[0].content_hash).toBe(
            h.generated.artifact.manifestHash,
          );
          if (!repaired) {
            expect(result.provenance?.authority).toBe('SUPERVISED_RUN_PATH');
            expect(result.provenance?.manifestHash).toBe(
              h.generated.artifact.manifestHash,
            );
          }
          supervisedSources.push({
            fixtureId: entry.id,
            variant: repaired ? 'repaired' : 'faulty',
            repetition,
            generated: h.generated,
            initial: h.initial,
            replay: h.replay,
            result,
          });
          observed.push({
            context: 'SUPERVISED_RUN_PATH',
            fixtureId: entry.id,
            variant: repaired ? 'repaired' : 'faulty',
            repetition,
            runId: h.run.id,
            manifestHash: h.generated.artifact.manifestHash,
            trialId: result.evidence.trialId,
            baselineId: result.baseline.id,
            result: result.reason,
            verdict: result.evidence.outcome,
            artifactStatus: result.artifact.verification,
            requests: 15,
            requestLimit: 15,
            predicateRef: result.evidence.predicateRef,
            evidenceId: result.evidence.id,
          });
        } finally {
          await h.close();
        }
      });
}
test('supervised insufficient remaining originating budget remains UNVERIFIED and adds no target work', async () => {
  const entry = suite.fixtures[0]!,
    h = await requiredArtifact(entry, 14);
  try {
    expect(h.s.snapshot.budget.usedRequests).toBe(10);
    const r = await verifyArtifact(h.s, h.s.snapshot, h.generated);
    expect(r.artifact.verification).toBe('UNVERIFIED');
    expect(r.reason).toBe('BUDGET EXHAUSTED');
    expect(h.s.snapshot.budget.usedRequests).toBe(10);
  } finally {
    await h.close();
  }
});
afterAll(async () => {
  // Sanitized observed rows, not a PASS claim; the test runner's exit/result is authoritative.
  const path = process.env.T047_EVIDENCE_FILE;
  if (path)
    await writeFile(
      path,
      JSON.stringify(
        {
          task: 'T047',
          classification:
            'CODEX-EXECUTED AUTOMATED LOCAL ARTIFACT ACCEPTANCE; NOT AUTONOMOUS DISCOVERY',
          observed,
          packageOrigins,
          packageSources,
          supervisedSources,
        },
        null,
        2,
      ) + '\n',
    );
});
