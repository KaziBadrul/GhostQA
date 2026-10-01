import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { canonical } from '../detection/predicate';
import { exactManifest } from './runner';
import { assertExecutableSecretFree } from './secret-free';
import { SecretVault } from '../secrets/vault';
const hash = (bytes: string) =>
  createHash('sha256').update(bytes).digest('hex');
// Build-time only. Neither esbuild nor this module enters the offline runtime.
export async function createRegressionBundle(
  value: unknown,
  expectedHash: string,
  suppliedVault?: SecretVault,
) {
  const manifest = exactManifest(value, expectedHash),
    vault = suppliedVault ?? new SecretVault();
  try {
    assertExecutableSecretFree(
      manifest,
      [
        manifest.journey,
        {
          ...manifest.journey,
          steps: [...manifest.reset.resetSteps, ...manifest.reset.checkSteps],
        },
      ],
      [
        manifest.predicate,
        ...manifest.reset.resetAssertions.map((a) => a.predicate),
        ...manifest.reset.baselineAssertions.map((a) => a.predicate),
      ],
      vault,
    );
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    const embedded = { manifest, manifestHash: expectedHash };
    const result = await build({
      absWorkingDir: root,
      stdin: {
        contents: `import { regressionMain, isDirectInvocation } from './src/cli/regression.ts';\nimport { runRegression } from './src/engine/exports/runner.ts';\nconst embedded = ${canonical(embedded)};\nexport const manifestHash = embedded.manifestHash;\nexport const runStandalone = (invocation, signal) => runRegression(embedded.manifest, embedded.manifestHash, invocation, signal);\nif (isDirectInvocation(import.meta.url)) await regressionMain(embedded);`,
        resolveDir: root,
        sourcefile: 'regression-entry.ts',
        loader: 'ts',
      },
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node24',
      write: false,
      minify: true,
      sourcemap: false,
      legalComments: 'none',
      metafile: true,
      define: { GHOSTQA_BUNDLE: 'true' },
      banner: {
        js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
      },
    });
    const code = result.outputFiles[0]!.text,
      runnerHash = hash(code);
    const identity = {
      formatVersion: 1,
      manifestHash: expectedHash,
      runnerHash,
    };
    return {
      ...identity,
      packageHash: hash(canonical(identity)),
      fileName: 'regression.mjs' as const,
      code,
      inputs: Object.keys(result.metafile!.inputs).sort(),
    };
  } finally {
    if (!suppliedVault) vault.discard();
  }
}
