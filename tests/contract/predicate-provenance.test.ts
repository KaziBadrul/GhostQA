import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { PredicateSchema } from '../../src/engine/contracts';
import { predicateHash } from '../../src/engine/detection/predicate';
import {
  eligiblePredicate,
  validatePredicate,
} from '../../src/engine/validation/predicate';
function make() {
  const logic = {
    applicability: [],
    assertions: [
      {
        op: 'equals' as const,
        left: { kind: 'literal' as const, value: 1 },
        right: { kind: 'literal' as const, value: 1 },
      },
    ],
  };
  return PredicateSchema.parse({
    id: randomUUID(),
    version: 1,
    canonicalHash: predicateHash(logic),
    source: 'DEVELOPER',
    sourceRef: 'owner-assertion',
    ...logic,
  });
}
test('developer-provided predicate preserves ID version hash through serialization', () => {
  const p = make();
  expect(validatePredicate(JSON.parse(JSON.stringify(p)))).toEqual(p);
  expect(eligiblePredicate(p, new Set())).toBe(true);
});
test('agent approval must reference an independently supplied approval record', () => {
  const p = make();
  p.source = 'AGENT_HYPOTHESIS';
  p.approvalRef = randomUUID();
  expect(eligiblePredicate(p, new Set())).toBe(false);
  expect(eligiblePredicate(p, new Set([p.approvalRef]))).toBe(true);
  p.approvalRef = undefined;
  expect(eligiblePredicate(p, new Set())).toBe(false);
});
for (const sourceRef of [
  'description:must reject',
  'example:status:403',
  'agent:openapi:status:403',
])
  test(`prose does not create specification authority: ${sourceRef}`, () => {
    const p = make();
    p.source = 'SPEC_ASSERTION';
    p.sourceRef = sourceRef;
    expect(eligiblePredicate(p, new Set())).toBe(false);
  });
test('unknown authority fields and executable predicate operators are rejected', () => {
  const p = make();
  expect(() => validatePredicate({ ...p, confirmed: true })).toThrow();
  expect(() =>
    validatePredicate({
      ...p,
      assertions: [{ op: 'javascript', expression: 'return true' }],
    }),
  ).toThrow();
});
test('changing assertions or applicability invalidates immutable semantic hash', () => {
  const p = make();
  expect(() =>
    validatePredicate({
      ...p,
      assertions: [
        { ...p.assertions[0]!, right: { kind: 'literal', value: 2 } },
      ],
    }),
  ).toThrow('PREDICATE HASH MISMATCH');
  expect(() =>
    validatePredicate({ ...p, applicability: p.assertions }),
  ).toThrow('PREDICATE HASH MISMATCH');
});
test('approval metadata does not rewrite logical predicate identity', () => {
  const p = make();
  const hash = p.canonicalHash;
  p.source = 'AGENT_HYPOTHESIS';
  p.approvalRef = randomUUID();
  expect(predicateHash(p)).toBe(hash);
  expect(validatePredicate(p).id).toBe(p.id);
});
test('specification source prefix alone cannot grant eligibility', () => {
  const p = make();
  p.source = 'SPEC_ASSERTION';
  p.sourceRef = 'openapi:status:GET /api/items:200';
  expect(eligiblePredicate(p, new Set())).toBe(false);
  expect(
    eligiblePredicate(p, new Set(), new Map([[p.sourceRef, p.canonicalHash]])),
  ).toBe(true);
  expect(
    eligiblePredicate(p, new Set(), new Map([[p.sourceRef, 'b'.repeat(64)]])),
  ).toBe(false);
});
test('approval cannot authorize a changed logical predicate with a stale hash', () => {
  const p = make();
  p.source = 'AGENT_HYPOTHESIS';
  p.approvalRef = randomUUID();
  p.assertions[0]!.right = { kind: 'literal', value: 2 };
  expect(eligiblePredicate(p, new Set([p.approvalRef]))).toBe(false);
});
