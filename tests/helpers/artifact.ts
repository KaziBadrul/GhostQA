import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  ApiModelSchema,
  FrozenScopeSchema,
  JourneySchema,
  PredicateSchema,
  ResetConfigurationSchema,
  PredicateRefSchema,
  Id,
  type RegressionArtifact,
  type Run,
  type Journey,
  type Evidence,
  type BaselineEvidence,
  type Observation,
  type MinimizationResult,
} from '../../src/engine/contracts';
import type { SecretVault } from '../../src/engine/secrets/vault';
import type { RunSupervisor } from '../../src/server/run-supervisor';
import {
  minimizationCase,
  syntheticTrial,
  without,
  minimizationHarness,
} from './minimization';
import { minimizeFinding } from '../../src/engine/minimization/greedy';

// Consumer contracts for T041/T042; no export/hash/verification implementation.
export const ManifestSchema = z.strictObject({
  formatVersion: z.literal(1),
  runnerVersion: z.string().min(1),
  reset: ResetConfigurationSchema,
  journey: JourneySchema,
  predicate: PredicateSchema,
  predicateRef: PredicateRefSchema,
  assertions: z.array(PredicateSchema.shape.assertions.element).min(1),
  apiModel: ApiModelSchema,
  scopeTemplate: FrozenScopeSchema.omit({ addresses: true, approvalId: true }),
  credentialSlots: z.array(z.string().min(1)),
  credentialBindings: z.array(
    z.strictObject({
      slot: z.string().min(1),
      kind: z.enum(['bearer', 'api-key']),
      location: z.literal('header'),
      name: z.string().min(1),
    }),
  ),
  provenance: z.strictObject({
    runId: Id,
    findingId: Id,
    originalJourneyId: Id,
    bestJourneyId: Id,
    initialEvidenceId: Id,
    replayEvidenceIds: z.array(Id).min(1),
    baselineEvidenceIds: z.array(Id).min(2),
    minimizationEvidenceIds: z.array(Id),
  }),
});
export type Manifest = z.infer<typeof ManifestSchema>;
export type Trial = {
  evidence: Evidence;
  baseline: BaselineEvidence;
  observations: Observation[];
};
export interface ExportInput {
  run: Run;
  original: Journey;
  minimization: MinimizationResult;
  initial: Trial;
  replays: Trial[];
  // Trusted, immutable eligibility as of run acceptance, not a model assertion.
  approvals: ReadonlySet<string>;
  specificationAssertions: ReadonlyMap<string, string>;
  artifactId: string;
  generatedAt: string;
  runnerVersion: string;
}
export interface GeneratedExport {
  artifact: RegressionArtifact;
  manifest: Manifest;
  bytes: string;
}
export interface ManifestBoundary {
  generateManifest(input: ExportInput, vault?: SecretVault): GeneratedExport;
  manifestHash(manifest: unknown): string;
}
export interface ReportBoundary {
  generateReport(
    input: ExportInput,
    vault?: SecretVault,
  ): { json: string; markdown: string };
}
export interface VerificationBoundary {
  verifyArtifact(
    supervisor: RunSupervisor,
    run: Run,
    generated: GeneratedExport,
  ): Promise<{
    artifact: RegressionArtifact;
    reason: string;
    baseline?: BaselineEvidence;
    evidence?: Evidence;
    provenance?: {
      runId: string;
      manifestHash: string;
      authority: 'SUPERVISED_RUN_PATH';
      assertionIds: string[];
    };
  }>;
}
async function boundary<T>(
  path: string,
  members: string[],
  task: string,
): Promise<T> {
  let loaded: unknown;
  try {
    loaded = await import(path);
  } catch (error) {
    throw new Error(`${task} missing boundary: ${path}`, { cause: error });
  }
  for (const name of members)
    if (
      !loaded ||
      typeof loaded !== 'object' ||
      typeof Reflect.get(loaded, name) !== 'function'
    )
      throw new Error(`${task} must implement ${name}`);
  return loaded as T;
}
export const manifestBoundary = () =>
  boundary<ManifestBoundary>(
    '../../src/engine/exports/manifest.ts',
    ['generateManifest', 'manifestHash'],
    'T041',
  );
export const reportBoundary = () =>
  boundary<ReportBoundary>(
    '../../src/engine/exports/report.ts',
    ['generateReport'],
    'T041',
  );
export const verificationBoundary = () =>
  boundary<VerificationBoundary>(
    '../../src/engine/exports/verify.ts',
    ['verifyArtifact'],
    'T042',
  );
export async function exportCase(): Promise<ExportInput> {
  const c = await minimizationCase();
  let best = c.journey;
  const attempts = ['readBefore', 'readAfter', 'extraOrder'].map(
    (removedStepId) => {
      const candidate = without(best, removedStepId);
      const trial = syntheticTrial(
        c.run,
        candidate,
        'VIOLATED',
        'MINIMIZATION',
      );
      best = candidate;
      return {
        candidate,
        removedStepId,
        accepted: true,
        reason: 'EXACT FRESH VIOLATION PRESERVED',
        trialId: trial.evidence.trialId,
        ...trial,
      };
    },
  );
  return {
    run: c.run,
    original: c.journey,
    initial: c.initial,
    replays: [c.replay],
    minimization: {
      finding: {
        ...c.finding,
        minimizedJourneyId: best.id,
        minimizationStop: 'LOCAL MINIMUM',
      },
      best,
      originalLength: 6,
      bestLength: 3,
      attempts,
      stopReason: 'LOCAL MINIMUM',
      locallyIrreducible: true,
    },
    approvals: new Set(),
    specificationAssertions: new Map(),
    artifactId: randomUUID(),
    generatedAt: '2026-10-01T00:00:00.000Z',
    runnerVersion: 'manifest-v1',
  };
}
export async function exportHarness(requests = 200) {
  const h = await minimizationHarness(requests);
  try {
    const minimization = await minimizeFinding(
      h.s,
      h.run,
      h.journey,
      h.finding,
    );
    const trace = await h.s.repository.trace(h.run.projectId, h.run.id);
    const replay: Trial = {
      ...h.confirmed,
      observations: trace.observations.filter(
        (o) =>
          o.trialId === h.confirmed.evidence.trialId &&
          h.journey.steps.some((s) => s.id === o.stepId),
      ),
    };
    const input: ExportInput = {
      run: h.run,
      original: h.journey,
      minimization,
      initial: h.initial,
      replays: [replay],
      approvals: new Set(),
      specificationAssertions: new Map(),
      artifactId: randomUUID(),
      generatedAt: '2026-10-01T00:00:00.000Z',
      runnerVersion: 'manifest-v1',
    };
    return { ...h, input };
  } catch (error) {
    await h.close();
    throw error;
  }
}
