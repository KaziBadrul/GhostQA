import { randomUUID } from 'node:crypto';
import {
  JourneySchema,
  type Journey,
  type Predicate,
  type Operand,
} from '../contracts';
import { canonical } from '../detection/predicate';
import { samePredicate } from '../detection/findings';
import { validatePredicate } from '../validation/predicate';
import { validateDependencies } from '../validation/dependencies';
export const identity = (p: Predicate) => ({
  id: p.id,
  version: p.version,
  hash: p.canonicalHash,
});
export const definition = (journey: Journey) =>
  canonical({ ...journey, id: null });
export function deletedCandidate(journey: Journey, index: number) {
  const removed = journey.steps[index]!;
  return {
    ...structuredClone(journey),
    id: randomUUID(),
    steps: journey.steps.filter((_, i) => i !== index),
    dependencies: journey.dependencies.filter(
      (d) => d.consumer !== removed.id && d.producer !== removed.id,
    ),
  };
}
export function planDeletion(
  journeyInput: Journey,
  predicateInput: Predicate,
  index: number,
): { candidate: Journey | null; reason: string } {
  const journey = JourneySchema.parse(journeyInput),
    predicate = validatePredicate(predicateInput);
  validateDependencies(journey);
  if (!samePredicate(journey.predicateRef, identity(predicate)))
    throw new Error('MINIMIZATION IDENTITY MISMATCH');
  if (!Number.isInteger(index) || index < 0 || index >= journey.steps.length)
    return { candidate: null, reason: 'INVALID DELETION INDEX' };
  if (journey.steps.length === 1)
    return { candidate: null, reason: 'EMPTY JOURNEY' };
  const removed = journey.steps[index]!;
  const references = (operand: Operand): boolean => {
    if ('stepId' in operand) return operand.stepId === removed.id;
    if (operand.kind === 'variable')
      return removed.extracts.some((v) => v.name === operand.name);
    return false;
  };
  if (
    [...predicate.applicability, ...predicate.assertions].some(
      (c) => references(c.left) || (c.right && references(c.right)),
    )
  )
    return { candidate: null, reason: 'PREDICATE STEP REQUIRED' };
  if (journey.dependencies.some((d) => d.producer === removed.id))
    return { candidate: null, reason: 'PRODUCER REQUIRED' };
  const candidate = deletedCandidate(journey, index);
  try {
    validateDependencies(candidate);
  } catch {
    return { candidate: null, reason: 'DEPENDENCY REQUIRED' };
  }
  return {
    candidate: JourneySchema.parse(candidate),
    reason: 'VALID SINGLE-STEP DELETION',
  };
}
