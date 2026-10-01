import { z } from 'zod';
import {
  JourneySchema,
  RunSchema,
  MinimizationAttemptSchema,
} from '../contracts';
import { canonical } from '../detection/predicate';
import { generateManifest, manifestHash } from './manifest';
import { GeneratedExportSchema, type GeneratedExport } from './contracts';
import { eligiblePredicate } from '../validation/predicate';
import {
  loadFinding,
  loadFindingRun,
  loadFindingJourney,
  loadTrialEvidence,
  verificationApprovals,
} from '../../server/repositories/findings';
import type { RunSupervisor } from '../../server/run-supervisor';
import type { Run } from '../contracts';

export function exactGenerated(input: GeneratedExport) {
  const generated = GeneratedExportSchema.parse(input);
  if (
    generated.artifact.verification !== 'UNVERIFIED' ||
    generated.artifact.verificationEvidenceIds.length ||
    generated.bytes !== canonical(generated.manifest) ||
    generated.artifact.manifestHash !== manifestHash(generated.manifest) ||
    generated.artifact.contentHash !== generated.artifact.manifestHash
  )
    throw new Error('ARTIFACT IDENTITY MISMATCH');
  return generated;
}
// Resolve the original trusted evidence, never caller/model approval. Rebuilding
// expected declarative bytes here checks identity; execution uses the supplied
// exact manifest, not a regenerated proposal or substituted journey.
export async function artifactSource(
  supervisor: RunSupervisor,
  runInput: Run,
  input: GeneratedExport,
) {
  const requested = RunSchema.parse(runInput),
    generated = exactGenerated(input),
    m = generated.manifest;
  const stored = await loadFinding(
    supervisor.client,
    requested.projectId,
    m.provenance.findingId,
  );
  if (
    stored.runId !== requested.id ||
    stored.runId !== m.provenance.runId ||
    stored.finding.id !== generated.artifact.findingId ||
    stored.finding.classification !== 'CONFIRMED' ||
    !stored.finding.consistent
  )
    throw new Error('ARTIFACT SOURCE MISMATCH');
  const run = await loadFindingRun(
    supervisor.client,
    stored.runId,
    requested.projectId,
  );
  if (
    ['apiSnapshot', 'scope', 'reset', 'predicates', 'credentialBindings'].some(
      (key) =>
        canonical(Reflect.get(requested, key)) !==
        canonical(Reflect.get(run, key)),
    )
  )
    throw new Error('ARTIFACT RUN MISMATCH');
  const original = await loadFindingJourney(
    supervisor.client,
    run,
    stored.finding,
  );
  const bestId = stored.finding.minimizedJourneyId ?? original.id;
  const bestRows = await supervisor.client.query<{ definition: unknown }>(
    "SELECT definition FROM journeys WHERE id=$1 AND run_id=$2 AND phase IN ('EXPLORATION','MINIMIZATION')",
    [bestId, run.id],
  );
  const best = JourneySchema.parse(bestRows.rows[0]?.definition);
  const initial = await loadTrialEvidence(
    supervisor.client,
    run,
    stored.finding.initialEvidenceId,
    'EXPLORATION',
    original,
  );
  const replays = [];
  for (const id of stored.finding.replayEvidenceIds)
    replays.push(
      await loadTrialEvidence(supervisor.client, run, id, 'REPLAY', original),
    );
  const eligibility = await verificationApprovals(
    supervisor.client,
    run,
    stored.finding,
  );
  if (
    !eligiblePredicate(
      eligibility.predicate,
      eligibility.replayApprovals,
      eligibility.specificationAssertions,
    )
  )
    throw new Error('ARTIFACT PREDICATE INELIGIBLE');
  const rows = await supervisor.client.query<{ evaluation: unknown }>(
    "SELECT evaluation FROM evidence WHERE run_id=$1 AND kind='MINIMIZATION ATTEMPT' AND evaluation->>'findingId'=$2 ORDER BY created_at,id",
    [run.id, stored.finding.id],
  );
  const attempts = rows.rows.map(
    (row) =>
      z.object({ attempt: MinimizationAttemptSchema }).parse(row.evaluation)
        .attempt,
  );
  for (const attempt of attempts)
    if (attempt.evidence) {
      const actual = await loadTrialEvidence(
        supervisor.client,
        run,
        attempt.evidence.id,
        'MINIMIZATION',
        attempt.candidate,
      );
      if (
        canonical(actual.evidence) !== canonical(attempt.evidence) ||
        canonical(actual.baseline) !== canonical(attempt.baseline) ||
        canonical(actual.observations) !== canonical(attempt.observations)
      )
        throw new Error('ARTIFACT MINIMIZATION MISMATCH');
    }
  const resultRows = await supervisor.client.query<{ evaluation: unknown }>(
    "SELECT evaluation FROM evidence WHERE run_id=$1 AND kind='MINIMIZATION RESULT' AND evaluation->>'findingId'=$2 ORDER BY created_at DESC,id DESC LIMIT 1",
    [run.id, stored.finding.id],
  );
  const result = z
    .object({
      sourceJourneyId: z.uuid(),
      bestJourneyId: z.uuid(),
      bestLength: z.int(),
      stopReason: z.string(),
      locallyIrreducible: z.boolean(),
    })
    .parse(resultRows.rows[0]?.evaluation);
  if (
    result.sourceJourneyId !== original.id ||
    result.bestJourneyId !== best.id ||
    result.bestLength !== best.steps.length ||
    result.stopReason !== stored.finding.minimizationStop
  )
    throw new Error('ARTIFACT BEST MISMATCH');
  const expected = generateManifest({
    run,
    original,
    initial,
    replays,
    minimization: {
      finding: stored.finding,
      best,
      originalLength: original.steps.length,
      bestLength: best.steps.length,
      attempts,
      stopReason: result.stopReason,
      locallyIrreducible: result.locallyIrreducible,
    },
    approvals: new Set(eligibility.replayApprovals),
    specificationAssertions: eligibility.specificationAssertions,
    artifactId: generated.artifact.id,
    generatedAt: generated.artifact.generatedAt,
    runnerVersion: generated.artifact.runnerVersion,
  });
  if (canonical(generated) !== canonical(expected))
    throw new Error('ARTIFACT CONTENT MISMATCH');
  const bestTrial =
    best.id === original.id
      ? replays.at(-1)!
      : attempts.find((a) => a.accepted && a.candidate.id === best.id);
  if (!bestTrial?.evidence || !bestTrial.observations.length)
    throw new Error('ARTIFACT BEST EVIDENCE REQUIRED');
  return { run, generated, original, initial, replays, bestTrial };
}
