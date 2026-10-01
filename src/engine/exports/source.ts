import { ExportInputSchema, type ExportInput } from './contracts';
import { canonical } from '../detection/predicate';
import { samePredicate, validateVerification } from '../detection/findings';
import { validatePredicate, eligiblePredicate } from '../validation/predicate';
import { validateJourney } from '../validation/journey';
import { definition, identity } from '../minimization/deletion';
import { preservesReduction } from '../minimization/greedy';

export function exportSource(input: ExportInput) {
  const source = ExportInputSchema.parse(input);
  const { run, original, minimization, initial, replays } = source;
  const { finding, best } = minimization;
  const predicate = run.predicates.find((p) =>
    samePredicate(identity(p), finding.predicateRef),
  );
  if (
    !predicate ||
    finding.projectId !== run.projectId ||
    finding.originalJourneyId !== original.id ||
    !samePredicate(original.predicateRef, finding.predicateRef) ||
    !samePredicate(best.predicateRef, finding.predicateRef) ||
    initial.evidence.id !== finding.initialEvidenceId ||
    canonical(replays.map((t) => t.evidence.id)) !==
      canonical(finding.replayEvidenceIds) ||
    minimization.originalLength !== original.steps.length ||
    minimization.bestLength !== best.steps.length ||
    (finding.minimizedJourneyId && finding.minimizedJourneyId !== best.id) ||
    (finding.minimizationStop &&
      finding.minimizationStop !== minimization.stopReason)
  )
    throw new Error('EXPORT SOURCE IDENTITY MISMATCH');
  validatePredicate(predicate);
  return { source, predicate };
}
export function executableSource(input: ExportInput) {
  const { source, predicate } = exportSource(input);
  const { run, original, minimization, initial, replays } = source;
  const { finding, best } = minimization;
  if (
    finding.classification !== 'CONFIRMED' ||
    !finding.consistent ||
    !eligiblePredicate(
      predicate,
      source.approvals,
      source.specificationAssertions,
    )
  )
    throw new Error('EXPORT REQUIRES ELIGIBLE CONFIRMATION');
  validateJourney(original, run.apiSnapshot, run.scope, 'EXPLORATION');
  validateJourney(best, run.apiSnapshot, run.scope, 'ARTIFACT');
  for (const replay of replays) {
    validateVerification({
      run,
      predicate,
      finding: {
        ...finding,
        replayEvidenceIds: finding.replayEvidenceIds.filter(
          (id) => id !== replay.evidence.id,
        ),
      },
      initial,
      replay,
      initialApprovals: source.approvals,
      replayApprovals: source.approvals,
      specificationAssertions: source.specificationAssertions,
    });
    if (
      initial.evidence.outcome !== 'VIOLATED' ||
      replay.evidence.outcome !== 'VIOLATED'
    )
      throw new Error('EXPORT CONFIRMATION EVIDENCE REQUIRED');
  }
  let previous = original;
  const usedTrials = [
    initial.evidence.trialId,
    ...replays.map((t) => t.evidence.trialId),
  ];
  const usedBaselines = [
    initial.baseline.id,
    ...replays.map((t) => t.baseline.id),
  ];
  for (const attempt of minimization.attempts) {
    if (attempt.accepted) {
      if (
        attempt.executionOutcome ||
        !preservesReduction({
          run,
          finding,
          original: previous,
          candidate: attempt.candidate,
          predicate,
          trial: {
            evidence: attempt.evidence,
            baseline: attempt.baseline,
            observations: attempt.observations,
          },
          usedTrialIds: usedTrials,
          usedBaselineIds: usedBaselines,
          approvals: source.approvals,
          specificationAssertions: source.specificationAssertions,
        })
      )
        throw new Error('EXPORT MINIMIZATION EVIDENCE REQUIRED');
      previous = attempt.candidate;
    }
    if (attempt.trialId) usedTrials.push(attempt.trialId);
    if (attempt.baseline) usedBaselines.push(attempt.baseline.id);
  }
  if (definition(previous) !== definition(best) || previous.id !== best.id)
    throw new Error('EXPORT BEST EVIDENCE MISMATCH');
  return { source, predicate };
}
export { assertExecutableSecretFree } from './secret-free';
