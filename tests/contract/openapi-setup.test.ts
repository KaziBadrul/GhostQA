import { beforeEach, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/openapi/route';
import { GET } from '../../src/app/api/setup/route';
import { boundedText, validSetupWrite } from '../../src/server/setup-guards';
import { parseOpenApi } from '../../src/engine/openapi/parse';
vi.mock('../../src/engine/openapi/parse', () => ({ parseOpenApi: vi.fn() }));
const token = 'a'.repeat(64);
function request(
  body = 'openapi: 3.1.0',
  headers: Record<string, string> = {},
) {
  return new NextRequest('http://localhost:3000/api/openapi', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'content-type': 'text/plain',
      cookie: `ghostqa-setup=${token}`,
      'x-ghostqa-csrf': token,
      ...headers,
    },
    body,
  });
}
beforeEach(() => {
  vi.mocked(parseOpenApi).mockReset();
});
test('import requires a local host, exact same origin and matching nonce', async () => {
  const rejectedHeaders: Record<string, string>[] = [
    { origin: 'https://attacker.example' },
    { host: 'attacker.example' },
    { 'x-ghostqa-csrf': 'b'.repeat(64) },
    { cookie: '' },
  ];
  for (const headers of rejectedHeaders) {
    expect(validSetupWrite(request('', headers))).toBe(false);
    expect((await POST(request('', headers))).status).toBe(403);
  }
  expect(parseOpenApi).not.toHaveBeenCalled();
});
test('nonce is fresh, httpOnly, strict and uncached', async () => {
  const req = new NextRequest('http://localhost:3000/api/setup', {
    headers: { host: 'localhost:3000' },
  });
  const first = GET(req),
    second = GET(req);
  expect((await first.json()).token).not.toBe((await second.json()).token);
  expect(first.headers.get('set-cookie')).toMatch(/HttpOnly/);
  expect(first.headers.get('set-cookie')).toMatch(/SameSite=strict/i);
  expect(first.headers.get('cache-control')).toBe('no-store');
});
test('preview returns operation metadata without schema/examples/response data', async () => {
  vi.mocked(parseOpenApi).mockResolvedValue({
    snapshotId: 'snapshot',
    contentHash: 'hash',
    openapiVersion: '3.1.0',
    operations: [
      {
        id: 'create',
        method: 'POST',
        pathTemplate: '/accounts',
        eligible: true,
        exclusionReasons: [],
        parameters: [],
        responses: { '200': { example: 'private-response-token' } },
      },
    ],
    importDiagnostics: [],
  });
  const response = await POST(request());
  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain('/accounts');
  expect(body).not.toContain('private-response-token');
  expect(body).not.toContain('responses');
});
test('bounded streaming input rejects oversized source before parsing', async () => {
  expect((await POST(request('x'.repeat(2 * 1024 * 1024 + 1)))).status).toBe(
    413,
  );
  expect(parseOpenApi).not.toHaveBeenCalled();
  await expect(boundedText(request('12345'), 4)).rejects.toThrow(
    'IMPORT TOO LARGE',
  );
});
test('parser failures return fixed feedback without reflecting target-controlled text', async () => {
  vi.mocked(parseOpenApi).mockRejectedValue(
    new Error('secret-token injected error'),
  );
  const response = await POST(request());
  expect(response.status).toBe(422);
  expect(await response.text()).not.toContain('secret-token');
});

test('slow document streams stop at a bounded deadline', async () => {
  vi.useFakeTimers();
  try {
    const stream = new ReadableStream<Uint8Array>();
    const req = new Request('http://localhost:3000/api/openapi', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit);
    const result = expect(boundedText(req, 100)).rejects.toThrow(
      'IMPORT TIMEOUT',
    );
    await vi.advanceTimersByTimeAsync(10000);
    await result;
  } finally {
    vi.useRealTimers();
  }
});
