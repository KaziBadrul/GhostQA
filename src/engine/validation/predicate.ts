import { PredicateSchema, type Predicate } from '../contracts';
import { predicateHash } from '../detection/predicate';
export function validatePredicate(value: unknown): Predicate {
  const p = PredicateSchema.parse(value);
  if (p.canonicalHash !== predicateHash(p))
    throw new Error('PREDICATE HASH MISMATCH');
  return p;
}
// Both collections are supplied by trusted deterministic code, never by a proposal.
// Explicit specification assertions must be grounded in the imported snapshot, not a prefix.
export function eligiblePredicate(
  p: Predicate,
  approved: ReadonlySet<string>,
  specificationAssertions: ReadonlyMap<string, string> = new Map(),
): boolean {
  try {
    validatePredicate(p);
  } catch {
    return false;
  }
  return (
    p.source === 'DEVELOPER' ||
    (p.source === 'SPEC_ASSERTION' &&
      /^openapi:(status|required|enum):/.test(p.sourceRef) &&
      specificationAssertions.get(p.sourceRef) === p.canonicalHash) ||
    (p.source === 'AGENT_HYPOTHESIS' &&
      p.approvalRef !== undefined &&
      approved.has(p.approvalRef))
  );
}
