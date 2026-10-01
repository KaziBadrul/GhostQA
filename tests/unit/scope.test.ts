import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import {
  approveScope,
  assertUrl,
  authorizeOperation,
} from '../../src/engine/policy/scope';
import type { Phase } from '../../src/engine/contracts';
const scope = () =>
  approveScope(
    'http://localhost:4010/api',
    [{ ip: '127.0.0.1', family: 4 }],
    [
      {
        operationId: 'GET /api/item',
        category: 'EXPLORATION',
        phases: ['EXPLORATION', 'REPLAY', 'MINIMIZATION', 'ARTIFACT'],
      },
      { operationId: 'POST /api/reset', category: 'RESET', phases: ['RESET'] },
      {
        operationId: 'GET /api/baseline',
        category: 'BASELINE',
        phases: ['BASELINE'],
      },
      { operationId: 'DELETE /api/secret', category: 'EXCLUDED', phases: [] },
    ],
    true,
    randomUUID(),
  );
test('explicit loopback, origin, port and segment boundary', () => {
  const s = scope();
  expect(() => assertUrl(s, 'http://localhost:4010/api/item')).not.toThrow();
  for (const u of [
    'http://evil:4010/api/item',
    'https://localhost:4010/api/item',
    'http://localhost:4011/api/item',
    'http://localhost:4010/apix/item',
  ])
    expect(() => assertUrl(s, u)).toThrow();
});
test.each([
  '../x',
  '%2e%2e/x',
  '%252e%252e/x',
  'x%2fy',
  'x%5cy',
  'x%252fy',
  'x\\y',
  'x#fragment',
  'x%xx',
])('rejects ambiguous original path %s', (path) => {
  expect(() =>
    assertUrl(scope(), `http://localhost:4010/api/${path}`),
  ).toThrow();
});
test('rejects userinfo and extracted foreign destinations', () => {
  expect(() =>
    assertUrl(scope(), 'http://user@localhost:4010/api/item'),
  ).toThrow();
  expect(() => assertUrl(scope(), 'http://169.254.169.254/latest')).toThrow();
});
test.each([
  ['GET /api/item', 'EXPLORATION'],
  ['POST /api/reset', 'RESET'],
  ['GET /api/baseline', 'BASELINE'],
] as [string, Phase][])('allows correctly classified %s in %s', (id, phase) => {
  expect(() => authorizeOperation(scope(), id, phase)).not.toThrow();
});
test.each([
  'RESET',
  'BASELINE',
  'EXPLORATION',
  'REPLAY',
  'MINIMIZATION',
  'ARTIFACT',
] as Phase[])('excluded operations never execute in %s', (phase) => {
  expect(() =>
    authorizeOperation(scope(), 'DELETE /api/secret', phase),
  ).toThrow();
});
test.each(['POST /api/reset', 'GET /api/baseline'])(
  'control %s cannot execute during exploration',
  (id) => {
    expect(() => authorizeOperation(scope(), id, 'EXPLORATION')).toThrow();
  },
);
test('unauthorized control use and hallucinated operation reject', () => {
  expect(() => authorizeOperation(scope(), 'GET /api/item', 'RESET')).toThrow();
  expect(() =>
    authorizeOperation(scope(), 'GET /invented', 'EXPLORATION'),
  ).toThrow();
});
import {
  validateFrozenScope,
  normalizeIp,
} from '../../src/engine/policy/scope';
test('literal IP cannot be approved with a different pinned address', () =>
  expect(() =>
    approveScope(
      'http://127.0.0.2:4010/api',
      [{ ip: '127.0.0.1', family: 4 }],
      scope().operationPolicy,
      true,
      randomUUID(),
    ),
  ).toThrow('PIN MISMATCH'));
test('frozen origin hostname port path and operation fields must remain consistent', () => {
  const s = scope();
  for (const mutated of [
    { ...s, hostname: 'foreign.invalid' },
    { ...s, port: 4000 },
    { ...s, basePathSegments: ['..'] },
    { ...s, operationIds: [] },
    { ...s, operationIds: [...s.operationIds, s.operationIds[0]!] },
  ])
    expect(() => validateFrozenScope(mutated)).toThrow();
  expect(() => validateFrozenScope(s)).not.toThrow();
});
test('IPv6 and mapped address representations normalize consistently', () => {
  expect(normalizeIp('0:0:0:0:0:0:0:1')).toBe('::1');
  expect(normalizeIp('::ffff:7f00:1')).toBe('127.0.0.1');
  expect(normalizeIp('::ffff:127.0.0.1')).toBe('127.0.0.1');
});
