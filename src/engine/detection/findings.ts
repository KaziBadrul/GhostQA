import { z } from 'zod';
import {
  BaselineEvidenceSchema,
  EvidenceSchema,
  FindingSchema,
  ObservationSchema,
  PredicateOutcomeSchema,
  RunSchema,
  type BaselineEvidence,
  type Evidence,
  type Finding,
  type Observation,
  type Predicate,
  type Run,
} from '../contracts';
import { canonical } from './predicate';
import { eligiblePredicate, validatePredicate } from '../validation/predicate';

export interface VerificationInput {
  run: Run;
  finding: Finding;
  predicate: Predicate;
  initial: {
    evidence: Evidence;
    baseline: BaselineEvidence;
    observations: Observation[];
  };
  replay: { evidence: unknown; baseline: unknown; observations: Observation[] };
  // Trusted deterministic eligibility at each trial; never supplied by the model.
  initialApprovals: ReadonlySet<string>;
  replayApprovals: ReadonlySet<string>;
  specificationAssertions: ReadonlyMap<string, string>;
}
const EvaluationSchema = z
  .strictObject({
    ...EvidenceSchema.shape,
    outcome: PredicateOutcomeSchema.optional(),
  })
  .refine((e) => e.id !== e.baselineEvidenceId, 'Self-referencing evidence');
// Legacy immutable label-renaming transitions remain readable.
const HistoricalClassification = z.enum([
  'OBSERVED VIOLATION',
  'CONFIRMED',
  'INCONCLUSIVE',
  'NON-REPRODUCED',
  'SUSPICIOUS',
]);
const TransitionSchema = z.strictObject({
  prior: HistoricalClassification.nullable(),
  next: HistoricalClassification,
  evidenceRefs: z.array(z.uuid()),
  reason: z.string().min(1),
});
export function samePredicate(
  a: Evidence['predicateRef'],
  b: Evidence['predicateRef'],
) {
  return a.id === b.id && a.version === b.version && a.hash === b.hash;
}
function checkTrial(
  run: Run,
  evidence: z.infer<typeof EvaluationSchema>,
  baseline: BaselineEvidence,
  observations: Observation[],
  phase: 'EXPLORATION' | 'REPLAY',
) {
  const exact = (a: string[], b: string[]) =>
    a.length === b.length &&
    new Set(a).size === a.length &&
    a.every((id) => b.includes(id));
  if (
    evidence.runId !== run.id ||
    baseline.runId !== run.id ||
    baseline.trialId !== evidence.trialId ||
    evidence.baselineEvidenceId !== baseline.id ||
    evidence.phase !== phase ||
    !exact(
      baseline.assertionIds,
      run.reset.baselineAssertions.map((a) => a.id),
    ) ||
    !exact(
      baseline.resetStepIds,
      run.reset.resetSteps.map((s) => s.id),
    ) ||
    !exact(
      baseline.checkStepIds,
      run.reset.checkSteps.map((s) => s.id),
    ) ||
    observations.length === 0 ||
    !exact(
      evidence.observationIds,
      observations.map((o) => o.id),
    ) ||
    new Set(observations.map((o) => o.stepId)).size !== observations.length ||
    observations.some(
      (o) =>
        o.runId !== run.id ||
        o.trialId !== evidence.trialId ||
        o.stepId !== o.result.stepId ||
        o.result.outcome !== 'RESPONSE' ||
        o.result.truncated,
    )
  )
    throw new Error('VERIFICATION EVIDENCE MISMATCH');
}
// Structural and reference validation is shared by the pure reducer and the
// durable repository. No target transport, model calls or mutable input history.
export function validateVerification(input: VerificationInput) {
  const run = RunSchema.parse(input.run);
  const finding = FindingSchema.parse(input.finding);
  const predicate = validatePredicate(input.predicate);
  const ref = {
    id: predicate.id,
    version: predicate.version,
    hash: predicate.canonicalHash,
  };
  const initial = EvidenceSchema.parse(input.initial.evidence);
  const replay = EvaluationSchema.parse(input.replay.evidence);
  const initialBaseline = BaselineEvidenceSchema.parse(input.initial.baseline);
  const replayBaseline = BaselineEvidenceSchema.parse(input.replay.baseline);
  const initialObservations = input.initial.observations.map((o) =>
    ObservationSchema.parse(o),
  );
  const replayObservations = input.replay.observations.map((o) =>
    ObservationSchema.parse(o),
  );
  if (
    finding.projectId !== run.projectId ||
    finding.initialEvidenceId !== initial.id ||
    !samePredicate(ref, finding.predicateRef) ||
    !samePredicate(ref, initial.predicateRef) ||
    !samePredicate(ref, replay.predicateRef) ||
    !run.predicates.some((p) => canonical(p) === canonical(predicate)) ||
    initial.id === replay.id ||
    initial.trialId === replay.trialId ||
    initialBaseline.id === replayBaseline.id ||
    finding.replayEvidenceIds.includes(replay.id) ||
    initial.observationIds.some((id) => replay.observationIds.includes(id))
  )
    throw new Error('VERIFICATION IDENTITY MISMATCH');
  finding.transitions.forEach((t) => TransitionSchema.parse(t));
  checkTrial(run, initial, initialBaseline, initialObservations, 'EXPLORATION');
  checkTrial(run, replay, replayBaseline, replayObservations, 'REPLAY');
  return {
    run,
    finding,
    predicate,
    initial,
    replay,
    initialBaseline,
    replayBaseline,
    initialObservations,
    replayObservations,
  };
}
export function transitionFinding(input: VerificationInput): Finding {
  const { finding, predicate, initial, replay } = validateVerification(input);
  const eligible =
    eligiblePredicate(
      predicate,
      input.initialApprovals,
      input.specificationAssertions,
    ) &&
    eligiblePredicate(
      predicate,
      input.replayApprovals,
      input.specificationAssertions,
    );
  let classification: Finding['classification'] = 'INCONCLUSIVE';
  let reason = !eligible
    ? 'PREDICATE NOT ELIGIBLE AT BOTH TRIALS'
    : 'VERIFICATION UNEVALUABLE';
  if (eligible && initial.outcome === 'VIOLATED') {
    if (replay.outcome === 'VIOLATED') {
      classification = 'CONFIRMED';
      reason = 'INDEPENDENT FRESH REPLAY VIOLATED';
    } else if (replay.outcome === 'SATISFIED') {
      classification = 'NON-REPRODUCED';
      reason = 'APPLICABLE FRESH REPLAY SATISFIED';
    } else if (replay.outcome === 'NOT APPLICABLE')
      reason = 'REPLAY NOT APPLICABLE';
  }
  const contrary =
    classification === 'CONFIRMED'
      ? 'NON-REPRODUCED'
      : classification === 'NON-REPRODUCED'
        ? 'CONFIRMED'
        : undefined;
  const consistent =
    finding.consistent &&
    !(
      contrary &&
      finding.transitions.some(
        (t) => TransitionSchema.parse(t).next === contrary,
      )
    );
  if (!consistent) {
    classification = 'INCONCLUSIVE';
    reason = 'INCONSISTENT INDEPENDENT EVIDENCE; NEW INITIAL TRIAL REQUIRED';
  }
  return FindingSchema.parse({
    ...finding,
    classification,
    consistent,
    replayEvidenceIds: [...finding.replayEvidenceIds, replay.id],
    transitions: [
      ...finding.transitions,
      {
        prior: finding.classification,
        next: classification,
        evidenceRefs: [initial.id, replay.id],
        reason,
      },
    ],
  });
}
export function inconclusiveVerification(
  value: Finding,
  reason: string,
): Finding {
  const finding = FindingSchema.parse(value);
  // A later failed execution provides no contrary predicate evidence.
  if (
    finding.classification === 'CONFIRMED' ||
    finding.classification === 'NON-REPRODUCED'
  )
    return finding;
  return FindingSchema.parse({
    ...finding,
    classification: 'INCONCLUSIVE',
    transitions: [
      ...finding.transitions,
      {
        prior: finding.classification,
        next: 'INCONCLUSIVE',
        evidenceRefs: [finding.initialEvidenceId],
        reason,
      },
    ],
  });
}
