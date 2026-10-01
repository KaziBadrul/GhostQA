import { afterEach, expect, test, vi } from 'vitest';
import type { LookupAddress } from 'node:dns';
const { mockLookup } = vi.hoisted(() => ({
  mockLookup:
    vi.fn<(host: string, options: { all: true }) => Promise<LookupAddress[]>>(),
}));
vi.mock('node:dns/promises', () => ({ lookup: mockLookup }));
import { lookup } from 'node:dns/promises';
import { previewScope, validatePreview } from '../../src/server/scope-preview';
const policy = [
  {
    operationId: 'GET /api/item',
    category: 'EXPLORATION' as const,
    phases: ['EXPLORATION' as const],
  },
];
afterEach(() => {
  vi.useRealTimers();
});
test('preview records complete pinned address set and hash-bound policy without re-resolution', async () => {
  mockLookup.mockResolvedValue([
    { address: '127.0.0.1', family: 4 },
    { address: '::1', family: 6 },
  ]);
  const preview = await previewScope('http://localhost:4010/api', policy, true);
  expect(preview.scope.addresses).toHaveLength(2);
  expect(validatePreview(preview, preview.hash)).toEqual(preview.scope);
  expect(lookup).toHaveBeenCalledTimes(1);
  expect(() =>
    validatePreview(
      { ...preview, scope: { ...preview.scope, port: 99 } },
      preview.hash,
    ),
  ).toThrow('STALE APPROVAL');
});
test('expired preview cannot authorize a new run', async () => {
  vi.useFakeTimers();
  mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
  const preview = await previewScope('http://localhost:4010/api', policy, true);
  await vi.advanceTimersByTimeAsync(60000);
  expect(() => validatePreview(preview, preview.hash)).toThrow(
    'STALE APPROVAL',
  );
});
test('DNS preview terminates on its finite deadline', async () => {
  vi.useFakeTimers();
  mockLookup.mockImplementation(() => new Promise(() => {}));
  const pending = expect(
    previewScope('http://localhost:4010/api', policy, true),
  ).rejects.toThrow('DNS TIMEOUT');
  await vi.advanceTimersByTimeAsync(3000);
  await pending;
});
