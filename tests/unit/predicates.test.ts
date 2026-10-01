import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import {
  PredicateSchema,
  JsonSchema,
  type Predicate,
  type Json,
} from '../../src/engine/contracts';
import { SecretVault } from '../../src/engine/secrets/vault';
import {
  evaluatePredicate,
  predicateHash,
} from '../../src/engine/detection/predicate';
import {
  validatePredicate,
  eligiblePredicate,
} from '../../src/engine/validation/predicate';
const context = () => ({
  vault: new SecretVault(),
  results: new Map(),
  inputs: {},
});
export function predicate(
  op = 'equals',
  left: Json = 1,
  right: Json = 1,
): Predicate {
  return PredicateSchema.parse({
    id: randomUUID(),
    version: 1,
    canonicalHash: predicateHash({
      applicability: [],
      assertions: [
        {
          op,
          left: { kind: 'literal', value: left },
          ...(op === 'exists' || op === 'absent'
            ? {}
            : { right: { kind: 'literal', value: right } }),
        },
      ],
    }),
    source: 'DEVELOPER',
    sourceRef: 'owner',
    applicability: [],
    assertions: [
      {
        op,
        left: { kind: 'literal', value: left },
        ...(op === 'exists' || op === 'absent'
          ? {}
          : { right: { kind: 'literal', value: right } }),
      },
    ],
  });
}
for (const [op, left, right, outcome] of [
  ['equals', 1, 1, 'SATISFIED'],
  ['equals', 1, '1', 'VIOLATED'],
  ['not-equals', 1, 2, 'SATISFIED'],
  ['in', 2, [1, 2], 'SATISFIED'],
  ['exists', null, null, 'SATISFIED'],
  ['absent', null, null, 'VIOLATED'],
] as const)
  test(`${op} typed ${outcome}`, () =>
    expect(
      evaluatePredicate(
        predicate(op, left, JsonSchema.parse(right)),
        context(),
      ),
    ).toBe(outcome));
test('missing/truncated operand outranks earlier violation', () => {
  const p = predicate('equals', 1, 2);
  p.assertions.push({
    op: 'equals',
    left: { kind: 'status', stepId: 'missing' },
    right: { kind: 'literal', value: 200 },
  });
  expect(evaluatePredicate(p, context())).toBe('UNEVALUABLE');
});
test('false applicability yields NOT APPLICABLE; missing applicability yields UNEVALUABLE', () => {
  const p = predicate();
  p.applicability = [
    {
      op: 'equals',
      left: { kind: 'literal', value: 1 },
      right: { kind: 'literal', value: 2 },
    },
  ];
  expect(evaluatePredicate(p, context())).toBe('NOT APPLICABLE');
  p.applicability[0]!.left = { kind: 'status', stepId: 'missing' };
  expect(evaluatePredicate(p, context())).toBe('UNEVALUABLE');
});
test('absent JSON field is meaningful; absent step is not absence evidence', () => {
  const p = predicate('absent');
  p.assertions[0]!.left = {
    kind: 'json',
    stepId: 'inspect',
    pointer: '/missing',
  };
  const c = context();
  c.results.set('inspect', {
    status: 200,
    headers: {},
    body: {},
    truncated: false,
  });
  expect(evaluatePredicate(p, c)).toBe('SATISFIED');
  c.results.clear();
  expect(evaluatePredicate(p, c)).toBe('UNEVALUABLE');
});
test('object equality is independent of property order and remains typed', () =>
  expect(
    evaluatePredicate(
      predicate('equals', { a: 1, b: 2 }, { b: 2, a: 1 }),
      context(),
    ),
  ).toBe('SATISFIED'));
test('secret equality evaluated transiently, identity mutation rejected', () => {
  const p = predicate();
  p.assertions = [
    {
      op: 'equals',
      left: { kind: 'variable', name: 'token' },
      right: { kind: 'variable', name: 'same' },
    },
  ];
  p.canonicalHash = predicateHash(p);
  const c = context();
  c.vault.set('token', 'sensitive', true);
  c.vault.set('same', 'sensitive', true);
  expect(evaluatePredicate(p, c)).toBe('SATISFIED');
  expect(validatePredicate(p).canonicalHash).toBe(p.canonicalHash);
  p.assertions[0]!.op = 'not-equals';
  expect(() => validatePredicate(p)).toThrow('PREDICATE HASH MISMATCH');
});
test('unapproved hypotheses and prose-derived assertions are ineligible', () => {
  const p = predicate();
  p.source = 'AGENT_HYPOTHESIS';
  expect(eligiblePredicate(p, new Set())).toBe(false);
  p.approvalRef = randomUUID();
  expect(eligiblePredicate(p, new Set([p.approvalRef]))).toBe(true);
  p.source = 'SPEC_ASSERTION';
  p.sourceRef = 'description:must';
  expect(eligiblePredicate(p, new Set())).toBe(false);
});
test('truncated response cannot satisfy exists or absent', () => {
  const c = context();
  c.results.set('s', {
    status: 200,
    headers: {},
    body: { id: 1 },
    truncated: true,
  });
  for (const op of ['exists', 'absent']) {
    const p = predicate(op);
    p.assertions[0]!.left = { kind: 'json', stepId: 's', pointer: '/id' };
    expect(evaluatePredicate(p, c)).toBe('UNEVALUABLE');
  }
});
test('conjunction requires every evaluable assertion and missing applicability outranks false', () => {
  const p = predicate();
  p.assertions.push({
    op: 'equals',
    left: { kind: 'literal', value: 1 },
    right: { kind: 'literal', value: 2 },
  });
  expect(evaluatePredicate(p, context())).toBe('VIOLATED');
  p.applicability = [
    {
      op: 'equals',
      left: { kind: 'literal', value: 1 },
      right: { kind: 'literal', value: 2 },
    },
    { op: 'exists', left: { kind: 'variable', name: 'missing' } },
  ];
  expect(evaluatePredicate(p, context())).toBe('UNEVALUABLE');
});
test('membership retains typed semantics and missing headers are not missing steps', () => {
  expect(evaluatePredicate(predicate('in', '1', [1]), context())).toBe(
    'VIOLATED',
  );
  const p = predicate('absent');
  p.assertions[0]!.left = { kind: 'header', stepId: 's', name: 'X-Missing' };
  const c = context();
  c.results.set('s', { status: 200, headers: {}, body: {}, truncated: false });
  expect(evaluatePredicate(p, c)).toBe('SATISFIED');
});
