import { randomUUID } from 'node:crypto';
import {
  BaselineEvidenceSchema,
  EvidenceSchema,
  FindingSchema,
  JourneySchema,
  ObservationSchema,
  RunSchema,
  type Finding,
} from '../contracts';
import { validatePredicate, eligiblePredicate } from '../validation/predicate';

// Initial classification only. No replay, model verdict or confirmation authority.
export function detectCandidate(
  runInput: unknown,
  journeyInput: unknown,
  evidenceInput: unknown,
  baselineInput: unknown,
  observationsInput: unknown[],
  approved: ReadonlySet<string> = new Set(),
  specificationAssertions: ReadonlyMap<string, string> = new Map(),
): Finding | null {
  const run = RunSchema.parse(runInput);
  const journey = JourneySchema.parse(journeyInput);
  const evidence = EvidenceSchema.parse(evidenceInput);
  const baseline = BaselineEvidenceSchema.parse(baselineInput);
  const observations = observationsInput.map((o) => ObservationSchema.parse(o));
  const predicate = run.predicates.find(
    (p) =>
      p.id === evidence.predicateRef.id &&
      p.version === evidence.predicateRef.version &&
      p.canonicalHash === evidence.predicateRef.hash,
  );
  if (
    !predicate ||
    journey.predicateRef.id !== evidence.predicateRef.id ||
    journey.predicateRef.version !== evidence.predicateRef.version ||
    journey.predicateRef.hash !== evidence.predicateRef.hash ||
    evidence.phase !== 'EXPLORATION' ||
    evidence.runId !== run.id ||
    baseline.runId !== run.id ||
    baseline.trialId !== evidence.trialId ||
    baseline.id !== evidence.baselineEvidenceId ||
    evidence.observationIds.length !== observations.length ||
    new Set(evidence.observationIds).size !== observations.length ||
    new Set(observations.map((o) => o.id)).size !== observations.length ||
    observations.length === 0 ||
    observations.some(
      (o) =>
        !evidence.observationIds.includes(o.id) ||
        o.runId !== run.id ||
        o.trialId !== evidence.trialId ||
        o.result.stepId !== o.stepId ||
        !journey.steps.some((s) => s.id === o.stepId),
    )
  )
    throw new Error('CANDIDATE EVIDENCE MISMATCH');
  validatePredicate(predicate);
  if (evidence.outcome === 'SATISFIED' || evidence.outcome === 'NOT APPLICABLE')
    return null;
  const complete = journey.steps.every((s) =>
    observations.some(
      (o) => o.stepId === s.id && o.result.outcome === 'RESPONSE',
    ),
  );
  const eligible = eligiblePredicate(
    predicate,
    approved,
    specificationAssertions,
  );
  const classification =
    evidence.outcome === 'VIOLATED' && complete && eligible
      ? 'OBSERVED VIOLATION'
      : 'INCONCLUSIVE';
  const reason =
    classification === 'OBSERVED VIOLATION'
      ? 'INITIAL PREDICATE VIOLATION'
      : !eligible
        ? 'PREDICATE NOT ELIGIBLE'
        : !complete
          ? 'EXECUTION EVIDENCE INCOMPLETE'
          : 'PREDICATE UNEVALUABLE';
  return FindingSchema.parse({
    id: randomUUID(),
    projectId: run.projectId,
    initialEvidenceId: evidence.id,
    replayEvidenceIds: [],
    predicateRef: evidence.predicateRef,
    classification,
    consistent: true,
    originalJourneyId: journey.id,
    transitions: [
      {
        prior: null,
        next: classification,
        evidenceRefs: [evidence.id],
        reason,
      },
    ],
  });
}
