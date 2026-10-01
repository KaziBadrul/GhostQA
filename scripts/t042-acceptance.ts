import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadLocalEnvironment } from '../src/server/config';
import { generateManifest } from '../src/engine/exports/manifest';
import { verifyArtifact } from '../src/engine/exports/verify';
import { canonical } from '../src/engine/detection/predicate';
import { exportHarness } from '../tests/helpers/artifact';
import { history } from '../tests/helpers/minimization';

// Supplied order-lifecycle acceptance only, not autonomous discovery or Gate 4.
// Target work uses the existing supervisor; no standalone execution is involved.
loadLocalEnvironment();
if (!process.env.TEST_DATABASE_URL)
  throw new Error('TEST_DATABASE_URL required');
const repaired = process.argv[2] === 'repaired';
if (process.argv[2] && !['faulty', 'repaired'].includes(process.argv[2]))
  throw new Error('INVALID ACCEPTANCE VARIANT');
const h = await exportHarness(39);
try {
  h.input.generatedAt = new Date().toISOString();
  const generated = generateManifest(h.input),
    before = await history(h);
  if (repaired) await h.repair();
  const result = await verifyArtifact(h.s, h.run, generated);
  const expected = repaired ? 'UNVERIFIED' : 'VERIFIED';
  if (
    result.artifact.verification !== expected ||
    result.evidence?.outcome !== (repaired ? 'SATISFIED' : 'VIOLATED') ||
    canonical(result.evidence.predicateRef) !==
      canonical(h.finding.predicateRef) ||
    result.baseline?.verdict !== 'SATISFIED' ||
    result.baseline.id === h.confirmed.baseline.id ||
    h.s.snapshot.budget.usedRequests !== 39 ||
    h.s.snapshot.budget.modelCalls !== 0
  )
    throw new Error('ARTIFACT ACCEPTANCE FAILED');
  const after = await history(h);
  for (const key of ['evidence', 'journeys', 'steps', 'transitions'] as const)
    if (
      before[key].some(
        (row) => !after[key].some((next) => canonical(next) === canonical(row)),
      )
    )
      throw new Error('HISTORICAL EVIDENCE CHANGED');
  const stored = await h.client.query(
    'SELECT verification_status,content_hash,evidence_refs FROM artifacts WHERE id=$1',
    [generated.artifact.id],
  );
  if (
    stored.rows[0]?.verification_status !== expected ||
    stored.rows[0]?.content_hash !== generated.artifact.manifestHash
  )
    throw new Error('ARTIFACT PERSISTENCE FAILED');
  const acceptance = {
    task: 'T042',
    result: 'PASS',
    scenario: 'SUPPLIED ORDER-LIFECYCLE CASE; NOT DISCOVERY',
    variant: repaired ? 'repaired' : 'faulty',
    runId: h.run.id,
    findingId: h.finding.id,
    artifactId: generated.artifact.id,
    originalLength: h.input.original.steps.length,
    bestLength: generated.manifest.journey.steps.length,
    manifestHash: generated.artifact.manifestHash,
    predicateRef: generated.manifest.predicateRef,
    verification: result.artifact.verification,
    predicateOutcome: result.evidence.outcome,
    baselineId: result.baseline.id,
    trialId: result.evidence.trialId,
    evidenceId: result.evidence.id,
    budget: h.s.snapshot.budget,
    initialEvidenceId: h.initial.evidence.id,
    replayEvidenceId: h.confirmed.evidence.id,
  };
  await h.s.stop('ARTIFACT VERIFICATION COMPLETE');
  const path = resolve('tests/acceptance', `t042-order-${h.run.id}.json`);
  await writeFile(
    path,
    JSON.stringify(
      { acceptance, generated, result, artifactRecords: stored.rows, ...after },
      null,
      2,
    ) + '\n',
    { flag: 'wx' },
  );
  console.log(
    JSON.stringify({
      ...acceptance,
      evidenceFile: `tests/acceptance/t042-order-${h.run.id}.json`,
    }),
  );
} finally {
  await h.close();
}
