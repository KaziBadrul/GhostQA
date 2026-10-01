import { expect, test } from 'vitest';
import { validateHeaders } from '../../src/engine/policy/headers';
test.each([
  'Host',
  'Content-Length',
  'Transfer-Encoding',
  'Connection',
  'Proxy-Authorization',
  'Upgrade',
  'TE',
  'Trailer',
  'Accept-Encoding',
])('rejects reserved %s', (name) => {
  expect(() => validateHeaders({ [name]: 'evil' })).toThrow();
});
test('rejects newlines, duplicate case-insensitive headers and oversized values', () => {
  for (const h of [
    { 'X-Test': 'a\r\nb' },
    { Authorization: 'a', authorization: 'b' },
    { 'X-Test': 'a'.repeat(17000) },
  ] as Record<string, string>[])
    expect(() => validateHeaders(h)).toThrow();
});
test('permits static bearer/API headers', () =>
  expect(
    validateHeaders({ Authorization: 'Bearer token', 'X-API-Key': 'secret' }),
  ).toEqual({ authorization: 'Bearer token', 'x-api-key': 'secret' }));
