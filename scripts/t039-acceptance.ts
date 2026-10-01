import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadLocalEnvironment } from '../src/server/config';
import { minimizeFinding } from '../src/engine/minimization/greedy';
import { MinimizationResultSchema } from '../src/engine/contracts/minimization';
import { canonical } from '../src/engine/detection/predicate';
import { history, minimizationHarness } from '../tests/helpers/minimization';

// Separate supplied minimization acceptance; no Gemini/discovery claim. All
// target requests go through the existing supervisor on the owned local fixture.
loadLocalEnvironment();
if (!process.env.TEST_DATABASE_URL)
  throw new Error('TEST_DATABASE_URL required');
const h = await minimizationHarness();
try {
  const before = await history(h);
  const result = MinimizationResultSchema.parse(
    await minimizeFinding(h.s, h.run, h.journey, h.finding),
  );
  if (
    result.originalLength !== 6 ||
    result.bestLength !== 3 ||
    result.stopReason !== 'LOCAL MINIMUM' ||
    !result.locallyIrreducible ||
    canonical(result.best.predicateRef) !== canonical(h.finding.predicateRef)
  )
    throw new Error('MINIMIZATION ACCEPTANCE FAILED');
  const accepted = result.attempts.filter((a) => a.accepted);
  if (
    accepted.length !== 3 ||
    accepted.some(
      (a) =>
        a.evidence?.outcome !== 'VIOLATED' ||
        a.baseline?.verdict !== 'SATISFIED',
    )
  )
    throw new Error('MINIMIZATION ACCEPTANCE FAILED');
  const budget = h.s.snapshot.budget;
  const acceptance = {
    task: 'T039',
    result: 'PASS',
    kind: 'SUPPLIED MINIMIZATION CASE; NOT DISCOVERY',
    runId: h.run.id,
    findingId: h.finding.id,
    originalJourneyId: h.journey.id,
    minimizedJourneyId: result.best.id,
    originalLength: result.originalLength,
    minimizedLength: result.bestLength,
    predicateRef: result.best.predicateRef,
    initialEvidenceId: h.initial.evidence.id,
    confirmationEvidenceId: h.confirmed.evidence.id,
    initialTrialId: h.initial.evidence.trialId,
    confirmationTrialId: h.confirmed.evidence.trialId,
    initialBaselineId: h.initial.baseline.id,
    confirmationBaselineId: h.confirmed.baseline.id,
    reductions: accepted.map((a) => ({
      removedStepId: a.removedStepId,
      journeyId: a.candidate.id,
      trialId: a.trialId,
      baselineId: a.baseline!.id,
      evidenceId: a.evidence!.id,
      predicateRef: a.evidence!.predicateRef,
    })),
    stopReason: result.stopReason,
    locallyIrreducible: result.locallyIrreducible,
    budget,
  };
  await h.s.stop('MINIMIZATION COMPLETE');
  const after = await history(h);
  for (const field of ['evidence', 'journeys', 'steps', 'transitions'] as const)
    if (
      before[field].some(
        (row) =>
          !after[field].some((next) => canonical(row) === canonical(next)),
      )
    )
      throw new Error('HISTORICAL EVIDENCE CHANGED');
  const runs = await h.client.query('SELECT * FROM runs WHERE id=$1', [
    h.run.id,
  ]);
  const findings = await h.client.query('SELECT * FROM findings WHERE id=$1', [
    h.finding.id,
  ]);
  const path = resolve('tests/acceptance', `t039-order-${h.run.id}.json`);
  await writeFile(
    path,
    JSON.stringify(
      {
        acceptance,
        result,
        runs: runs.rows,
        findings: findings.rows,
        ...after,
      },
      null,
      2,
    ) + '\n',
    { flag: 'wx' },
  );
  console.log(
    JSON.stringify({
      ...acceptance,
      evidenceFile: `tests/acceptance/t039-order-${h.run.id}.json`,
    }),
  );
} finally {
  await h.close();
}
