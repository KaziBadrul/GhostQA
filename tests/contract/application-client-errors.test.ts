import { afterEach, expect, test, vi } from 'vitest';
import { appRequest } from '../../src/lib/application-client';
import { AppRequestError } from '../../src/lib/error-guidance';
afterEach(() => vi.unstubAllGlobals());
test('a timed-out write warns of an unknown outcome and is never automatically retried', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ token: 'a'.repeat(64) }))
    .mockRejectedValueOnce(new DOMException('provider-secret', 'TimeoutError'));
  vi.stubGlobal('fetch', fetch);
  let error: unknown;
  try {
    await appRequest('/api/projects', 'POST', { name: 'Example' });
  } catch (value) {
    error = value;
  }
  expect(error).toBeInstanceOf(AppRequestError);
  expect((error as AppRequestError).code).toBe('WRITE TIMEOUT');
  expect((error as Error).message).toContain('Check saved project state');
  expect((error as Error).message).not.toContain('provider-secret');
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('a failed read has safe recovery guidance without raw network error text', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('secret connection string')),
  );
  await expect(appRequest('/api/projects')).rejects.toMatchObject({
    code: 'NETWORK ERROR',
  });
});
test('client preserves field details and known codes rather than echoing server exceptions', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          {
            code: 'INVALID INPUT',
            message: 'raw SQL secret',
            details: [
              {
                field: 'targetUrl',
                message: 'Use a supported value in the required format.',
              },
            ],
          },
          { status: 400 },
        ),
      ),
  );
  try {
    await appRequest('/api/projects');
    throw Error('Expected request failure');
  } catch (error) {
    expect(error).toMatchObject({
      code: 'INVALID INPUT',
      issues: [
        {
          field: 'targetUrl',
          message: 'Use a supported value in the required format.',
        },
      ],
    });
    expect((error as Error).message).not.toContain('raw SQL secret');
  }
});
