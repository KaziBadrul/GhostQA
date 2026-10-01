import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { VerticalSliceConfiguration } from '../../src/cli/vertical-slice';
import { FindingSchema } from '../../src/engine/contracts';
import { evaluatePredicate } from '../../src/engine/detection/predicate';
import { validatePredicate } from '../../src/engine/validation/predicate';
import { SecretVault } from '../../src/engine/secrets/vault';
import type { ValueContext } from '../../src/engine/execution/variables';

const configuration = VerticalSliceConfiguration.parse(
  JSON.parse(await readFile('acceptance-config.json', 'utf8')),
);
const predicate = validatePredicate(
  configuration.run.predicates.find(
    (p) => p.sourceRef === 'password-change-token-invalidation-policy',
  ),
);
function context(status: number): ValueContext {
  const context: ValueContext = {
    vault: new SecretVault(),
    inputs: {},
    results: new Map(),
  };
  for (const [id, ordinal, operationId, request, body, code] of [
    [
      'oldIssue',
      0,
      'POST /api/accounts/{accountId}/password-reset',
      { path: { accountId: 'account' } },
      { token: 'old-token' },
      200,
    ],
    [
      'changeIssue',
      1,
      'POST /api/accounts/{accountId}/password-reset',
      { path: { accountId: 'account' } },
      { token: 'change-token' },
      200,
    ],
    [
      'password',
      2,
      'POST /api/password-reset',
      { body: { token: 'change-token' } },
      {},
      200,
    ],
    [
      'use',
      3,
      'POST /api/password-reset',
      { body: { token: 'old-token' } },
      {},
      status,
    ],
  ] as const)
    context.results.set(id, {
      ordinal,
      operationId,
      request,
      body,
      status: code,
      headers: {},
      truncated: false,
    });
  return context;
}
test('both approved account invariants retain valid distinct identities/hashes', () => {
  expect(configuration.run.predicates).toHaveLength(2);
  for (const predicate of configuration.run.predicates)
    expect(validatePredicate(predicate)).toEqual(predicate);
  expect(new Set(configuration.run.predicates.map((p) => p.id)).size).toBe(2);
});
test.each([
  [200, 'VIOLATED'],
  [403, 'SATISFIED'],
] as const)(
  'password-change assertion evaluates status %s as %s',
  (status, verdict) => {
    expect(evaluatePredicate(predicate, context(status))).toBe(verdict);
  },
);
test.each(['other-account', 'new-token', 'before-change', 'failed-change'])(
  'password-change assertion excludes %s from eligible violation evidence',
  (kind) => {
    const c = context(200);
    if (kind === 'other-account')
      c.results.get('changeIssue')!.request = { path: { accountId: 'other' } };
    if (kind === 'new-token')
      c.results.get('use')!.request = { body: { token: 'fresh-token' } };
    if (kind === 'before-change') c.results.get('oldIssue')!.ordinal = 4;
    if (kind === 'failed-change') c.results.get('password')!.status = 403;
    expect(evaluatePredicate(predicate, c)).toBe('NOT APPLICABLE');
  },
);
test('current finding vocabulary accepts the new label and rejects the legacy label', () => {
  expect(
    FindingSchema.shape.classification.safeParse('OBSERVED VIOLATION').success,
  ).toBe(true);
  expect(
    FindingSchema.shape.classification.safeParse('SUSPICIOUS').success,
  ).toBe(false);
});
