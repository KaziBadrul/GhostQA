import { beforeEach, expect, test, vi } from 'vitest';
import { applicationRequest } from '../../src/server/application-api';
import { installApplication } from '../../src/server/application-runtime';
import { appRequest } from '../../src/lib/application-client';
const command = vi.fn();
const token = 'a'.repeat(64);
function request(headers: Record<string, string> = {}, body = '{}') {
  return new Request('http://localhost:3000/api/projects', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      cookie: `ghostqa-setup=${token}`,
      'x-ghostqa-csrf': token,
      ...headers,
    },
    body,
  });
}
beforeEach(() => {
  command.mockReset();
  installApplication({ command, shutdown: async () => {} });
});
test('project mutations reject foreign origins, hosts and unmatched tokens before storage', async () => {
  const invalidHeaders: Record<string, string>[] = [
    { origin: 'https://attacker.test' },
    { host: 'attacker.test' },
    { 'x-ghostqa-csrf': 'b'.repeat(64) },
    { cookie: '' },
  ];
  for (const headers of invalidHeaders)
    expect((await applicationRequest(request(headers), 'create')).status).toBe(
      403,
    );
  expect(command).not.toHaveBeenCalled();
});
test('bounded bodies and invalid identifiers are rejected before storage', async () => {
  expect(
    (
      await applicationRequest(
        request({}, 'x'.repeat(128 * 1024 + 1)),
        'create',
      )
    ).status,
  ).toBe(413);
  expect((await applicationRequest(request(), 'edit', 'bad-id')).status).toBe(
    404,
  );
  expect(command).not.toHaveBeenCalled();
});
test('storage errors never echo raw credentials or SQL', async () => {
  command.mockRejectedValue(Error('secret-value SQL connection detail'));
  const response = await applicationRequest(request(), 'create');
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('secret-value');
});
test('browser application client rejects target URLs and protocol-relative escapes', async () => {
  for (const path of [
    'http://localhost:4010/api/orders',
    '//attacker.test/api/orders',
    '/api/../orders',
    '/api/orders?target=http://attacker.test',
  ])
    await expect(appRequest(path)).rejects.toThrow(
      'Invalid local application path',
    );
});

test('field-specific validation errors omit raw values and unrecognized keys', async () => {
  const { EditProjectSchema } =
    await import('../../src/server/application-contracts');
  const secret = 'private-rejected-value';
  const invalid = EditProjectSchema.safeParse({
    name: 42,
    targetUrl: secret,
    [secret]: 'secret',
  });
  if (invalid.success) throw Error('Expected validation failure');
  command.mockRejectedValue(invalid.error);
  const response = await applicationRequest(
    request(),
    'edit',
    '00000000-0000-4000-8000-000000000000',
  );
  expect(response.status).toBe(400);
  const value = await response.json();
  expect(value.details).toEqual(
    expect.arrayContaining([expect.objectContaining({ field: 'targetUrl' })]),
  );
  expect(JSON.stringify(value)).not.toContain(secret);
});
test('known setup conflicts preserve a specific actionable category', async () => {
  command.mockRejectedValue(Error('INVALID SETUP: CONTROL EXCLUDED'));
  const response = await applicationRequest(
    request(),
    'preview',
    '00000000-0000-4000-8000-000000000000',
  );
  expect(response.status).toBe(422);
  const value = await response.json();
  expect(value.code).toBe('INVALID SETUP: CONTROL EXCLUDED');
  expect(value.message).toContain('Target and operations');
});
test('invalid JSON points to syntax correction without reflecting submitted content', async () => {
  const response = await applicationRequest(
    request({}, '{"secret":"private"'),
    'create',
  );
  expect(response.status).toBe(400);
  const value = await response.json();
  expect(value.code).toBe('INVALID JSON');
  expect(JSON.stringify(value)).not.toContain('private');
});

test.each(['MODEL QUOTA EXHAUSTED', 'MODEL REQUEST REJECTED'])(
  'pre-admission provider failure %s keeps its actionable code',
  async (code) => {
    command.mockRejectedValue(Error(code));
    const response = await applicationRequest(
      request(),
      'start',
      '00000000-0000-4000-8000-000000000000',
    );
    expect(response.status).toBe(503);
    const value = await response.json();
    expect(value.code).toBe(code);
    expect(value.message).not.toContain('STORAGE ERROR');
  },
);
