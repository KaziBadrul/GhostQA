import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startOrderFixture } from '../fixtures/api/order-lifecycle';
import { createRegressionBundle } from '../src/engine/exports/bundle';
import { ManifestSchema } from '../src/engine/exports/contracts';
import { manifestHash } from '../src/engine/exports/manifest-integrity';
import { requiredOperations } from '../src/engine/exports/runner';
import { canonical } from '../src/engine/detection/predicate';

const path =
  'tests/acceptance/t042-order-82fdb889-5b6c-49bf-852f-f1b092cb394a.json';
const original = await readFile(path),
  snapshot = JSON.parse(original.toString('utf8'));
const manifest = ManifestSchema.parse(snapshot.generated.manifest),
  hash = manifestHash(manifest);
if (
  hash !== snapshot.generated.artifact.manifestHash ||
  snapshot.result.artifact.verification !== 'VERIFIED'
)
  throw new Error('SOURCE ARTIFACT IDENTITY ERROR');
const bundle = await createRegressionBundle(manifest, hash),
  again = await createRegressionBundle(manifest, hash);
if (bundle.code !== again.code || bundle.packageHash !== again.packageHash)
  throw new Error('NONDETERMINISTIC BUNDLE');
const directory = resolve('dist/regression', bundle.packageHash);
await mkdir(directory, { recursive: true });
const file = join(directory, bundle.fileName);
await writeFile(file, bundle.code);
await writeFile(join(directory, 'manifest.json'), canonical(manifest));
await writeFile(
  join(directory, 'identity.json'),
  canonical({
    formatVersion: bundle.formatVersion,
    manifestHash: hash,
    runnerHash: bundle.runnerHash,
    packageHash: bundle.packageHash,
  }),
);
const child = promisify(execFile);
const results: {
  variant: string;
  iteration: number;
  exitCode: number;
  result: unknown;
}[] = [];
for (const repaired of [false, true]) {
  const fixture = await startOrderFixture(repaired);
  try {
    for (let iteration = 1; iteration <= 3; iteration++) {
      const args = [
        file,
        '--target',
        fixture.url + '/api',
        '--address',
        '127.0.0.1',
        ...requiredOperations(manifest).flatMap((id) => [
          '--approve-operation',
          id,
        ]),
        '--ack-mutations',
        '--requests',
        '5',
        '--milliseconds',
        '10000',
        '--request-timeout-ms',
        '1000',
      ];
      let stdout: string, stderr: string, exitCode: number;
      try {
        const output = await child(process.execPath, args, {
          env: { NODE_ENV: 'production' },
          timeout: 15000,
        });
        stdout = output.stdout;
        stderr = output.stderr;
        exitCode = 0;
      } catch (error) {
        const e = error as { stdout: string; stderr: string; code: number };
        stdout = e.stdout;
        stderr = e.stderr;
        exitCode = e.code;
      }
      if (stderr) throw new Error('STANDALONE STDERR');
      const result = JSON.parse(stdout);
      if (
        exitCode !== (repaired ? 0 : 1) ||
        result.context !== 'INDEPENDENT' ||
        result.result !== (repaired ? 'PASS' : 'FAIL') ||
        result.verdict !== (repaired ? 'SATISFIED' : 'VIOLATED') ||
        result.usedRequests !== 5 ||
        canonical(result.predicateRef) !== canonical(manifest.predicateRef)
      )
        throw new Error('STANDALONE ACCEPTANCE ERROR');
      results.push({
        variant: repaired ? 'repaired' : 'faulty',
        iteration,
        exitCode,
        result,
      });
    }
  } finally {
    await fixture.close();
  }
}
const after = await readFile(path);
if (!after.equals(original)) throw new Error('HISTORICAL EVIDENCE MUTATION');
const artifact = {
  task: 'T043',
  source: path,
  sourceSha256: createHash('sha256').update(original).digest('hex'),
  manifestHash: hash,
  predicateRef: manifest.predicateRef,
  journeyLength: manifest.journey.steps.length,
  package: {
    formatVersion: bundle.formatVersion,
    fileName: bundle.fileName,
    runnerHash: bundle.runnerHash,
    packageHash: bundle.packageHash,
    bytes: Buffer.byteLength(bundle.code),
    directory: directory.slice(process.cwd().length + 1),
  },
  deterministicBundle: true,
  originatingEvidenceUnchanged: true,
  originatingArtifactStatus: 'VERIFIED (unchanged)',
  standaloneHasOriginatingWriteAuthority: false,
  noDatabaseOrGemini: true,
  results,
};
await writeFile(
  'tests/acceptance/t043-standalone.json',
  canonical(artifact) + '\n',
  { flag: 'wx' },
);
process.stdout.write(
  canonical({
    task: 'T043',
    manifestHash: hash,
    packageHash: bundle.packageHash,
    faulty: '3/3 FAIL / VIOLATED',
    repaired: '3/3 PASS / SATISFIED',
    originatingEvidenceUnchanged: true,
  }) + '\n',
);
