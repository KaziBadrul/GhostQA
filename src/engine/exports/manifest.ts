import { RegressionArtifactSchema, type Journey } from '../contracts';
import { canonical } from '../detection/predicate';
import { manifestHash } from './manifest-integrity';
import { SecretVault } from '../secrets/vault';
import { ManifestSchema, type ExportInput } from './contracts';
import { executableSource, assertExecutableSecretFree } from './source';
export { ManifestSchema } from './contracts';
export type { ExportInput, Manifest } from './contracts';

export { manifestHash } from './manifest-integrity';
export function generateManifest(
  input: ExportInput,
  suppliedVault?: SecretVault,
) {
  const vault = suppliedVault ?? new SecretVault();
  try {
    const { source, predicate } = executableSource(input);
    const { run, original, minimization, initial, replays } = source;
    const { finding, best } = minimization;
    const scopeTemplate = {
      origin: run.scope.origin,
      hostname: run.scope.hostname,
      port: run.scope.port,
      basePathSegments: run.scope.basePathSegments,
      operationIds: run.scope.operationIds,
      operationPolicy: run.scope.operationPolicy,
      mutationsAcknowledged: run.scope.mutationsAcknowledged,
    };
    const bindings = run.credentialBindings.map(
      ({ slot, kind, location, name }) => ({ slot, kind, location, name }),
    );
    const manifest = ManifestSchema.parse({
      formatVersion: 1,
      runnerVersion: source.runnerVersion,
      reset: run.reset,
      journey: best,
      predicate,
      predicateRef: finding.predicateRef,
      assertions: predicate.assertions,
      apiModel: run.apiSnapshot,
      scopeTemplate,
      credentialSlots: bindings.map((b) => b.slot),
      credentialBindings: bindings,
      provenance: {
        runId: run.id,
        findingId: finding.id,
        originalJourneyId: original.id,
        bestJourneyId: best.id,
        initialEvidenceId: initial.evidence.id,
        replayEvidenceIds: replays.map((t) => t.evidence.id),
        baselineEvidenceIds: [
          initial.baseline.id,
          ...replays.map((t) => t.baseline.id),
          ...minimization.attempts
            .filter((a) => a.baseline)
            .map((a) => a.baseline!.id),
        ],
        minimizationEvidenceIds: minimization.attempts
          .filter((a) => a.evidence)
          .map((a) => a.evidence!.id),
      },
    });
    const controls: Journey = {
      ...best,
      steps: [...run.reset.resetSteps, ...run.reset.checkSteps],
    };
    assertExecutableSecretFree(
      manifest,
      [best, controls],
      [
        predicate,
        ...run.reset.resetAssertions.map((a) => a.predicate),
        ...run.reset.baselineAssertions.map((a) => a.predicate),
      ],
      vault,
    );
    const hash = manifestHash(manifest),
      bytes = canonical(manifest);
    // At T041 the exported content IS the manifest. T043 will separately identify
    // runner/package bytes; this hash makes no bundle verification claim.
    const artifact = RegressionArtifactSchema.parse({
      id: source.artifactId,
      findingId: finding.id,
      formatVersion: 1,
      contentHash: hash,
      manifestHash: hash,
      journey: best,
      predicate,
      reset: run.reset,
      apiModel: run.apiSnapshot,
      scopeTemplate,
      credentialSlots: manifest.credentialSlots,
      generatedAt: source.generatedAt,
      verification: 'UNVERIFIED',
      verificationEvidenceIds: [],
      verificationAuthority: 'SUPERVISED_RUN_PATH',
      generationState: 'GENERATED',
      runnerVersion: source.runnerVersion,
    });
    return { artifact, manifest, bytes };
  } finally {
    if (!suppliedVault) vault.discard();
  }
}
