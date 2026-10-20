import { afterEach, expect, test, vi } from 'vitest';
import { createServer, get as httpGet } from 'node:http';
import { once } from 'node:events';
import { authorizeIngress, readHostingConfig } from '../../src/server/hosting';
import {
  localRequest,
  setupNonce,
  validSetupWrite,
} from '../../src/server/setup-guards';
import { documentationVault } from '../../src/server/mcp/documentation';

const origin = 'https://ghostqa.example';
const password = 'private-operator-password-1234567890';
const env = {
  GHOSTQA_PUBLIC_ORIGIN: origin,
  GHOSTQA_ADMIN_PASSWORD: password,
  PORT: '10000',
};
const authorization =
  'Basic ' + Buffer.from(`ghostqa:${password}`).toString('base64');
afterEach(() => vi.unstubAllEnvs());

test('local default stays loopback; hosted mode uses the assigned port', () => {
  expect(readHostingConfig({})).toEqual({ hostname: '127.0.0.1', port: 3000 });
  expect(readHostingConfig(env)).toMatchObject({
    hostname: '0.0.0.0',
    port: 10000,
    publicOrigin: origin,
  });
  expect(
    readHostingConfig({
      RENDER: 'true',
      RENDER_EXTERNAL_URL: origin,
      GHOSTQA_ADMIN_PASSWORD: password,
    }).publicOrigin,
  ).toBe(origin);
});

test.each(['0', '-1', '65536', 'abc', '1.5', ''])(
  'rejects invalid port %s',
  (port) => {
    expect(() => readHostingConfig({ PORT: port })).toThrow(
      'Invalid hosting configuration',
    );
  },
);
test.each([
  'http://ghostqa.example',
  'https://user:secret@ghostqa.example',
  'https://ghostqa.example/path',
  'https://ghostqa.example?q=1',
  'https://ghostqa.example/#fragment',
])('rejects ambiguous public origin %s', (publicOrigin) => {
  expect(() =>
    readHostingConfig({ ...env, GHOSTQA_PUBLIC_ORIGIN: publicOrigin }),
  ).toThrow('Invalid hosting configuration');
});
test('Render startup fails closed without origin or strong operator credentials', () => {
  expect(() => readHostingConfig({ RENDER: 'true' })).toThrow(
    'public origin required',
  );
  for (const secret of [
    undefined,
    'short',
    'x'.repeat(257),
    'x'.repeat(32) + '\n',
  ])
    expect(() =>
      readHostingConfig({ ...env, GHOSTQA_ADMIN_PASSWORD: secret }),
    ).toThrow('GHOSTQA_ADMIN_PASSWORD');
});

test('hosted setup preserves authentication, origin, CSRF and secure cookie checks behind TLS termination', () => {
  vi.stubEnv('GHOSTQA_PUBLIC_ORIGIN', origin);
  vi.stubEnv('GHOSTQA_ADMIN_PASSWORD', password);
  const token = 'a'.repeat(64);
  const make = (override: Record<string, string> = {}) =>
    new Request('http://0.0.0.0:10000/api/setup', {
      headers: {
        host: 'ghostqa.example',
        origin,
        authorization,
        cookie: `ghostqa-setup=${token}`,
        'x-ghostqa-csrf': token,
        ...override,
      },
    });
  expect(localRequest(make())).toBe(true);
  expect(validSetupWrite(make())).toBe(true);
  const invalidHeaders: Record<string, string>[] = [
    { host: 'attacker.test' },
    { origin: 'https://attacker.test' },
    { authorization: '' },
    { cookie: '' },
    { 'x-ghostqa-csrf': 'b'.repeat(64) },
  ];
  for (const headers of invalidHeaders)
    expect(validSetupWrite(make(headers))).toBe(false);
  expect(setupNonce(make()).headers.get('set-cookie')).toContain('Secure');
});

test('real HTTP ingress protects pages and APIs and distrusts forwarding headers', async () => {
  const config = readHostingConfig(env);
  let handled = 0;
  const server = createServer((request, response) => {
    if (!authorizeIngress(request, response, config)) return;
    handled++;
    response.end(
      JSON.stringify({
        proto: request.headers['x-forwarded-proto'],
        forwarded: request.headers.forwarded ?? null,
      }),
    );
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw Error('Missing test address');
  const base = `http://127.0.0.1:${address.port}`;
  const fetch = (url: string, options: { headers: Record<string, string> }) =>
    new Promise<Response>((resolve, reject) => {
      httpGet(url, options, async (response) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of response) chunks.push(Buffer.from(chunk));
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode,
              headers: {
                'WWW-Authenticate': String(
                  response.headers['www-authenticate'] ?? '',
                ),
              },
            }),
          );
        } catch (error) {
          reject(error);
        }
      }).on('error', reject);
    });
  try {
    for (const path of ['/', '/api/projects', '/_next/static/app.js']) {
      const rejected = await fetch(base + path, {
        headers: { host: 'ghostqa.example' },
      });
      expect(rejected.status).toBe(401);
      expect(rejected.headers.get('www-authenticate')).toContain('Basic');
    }
    for (const value of [
      'Basic !!!',
      'Bearer forged',
      'Basic ' + Buffer.from('other:' + password).toString('base64'),
      'Basic ' + Buffer.from('ghostqa:wrong').toString('base64'),
    ])
      expect(
        (
          await fetch(base, {
            headers: { host: 'ghostqa.example', authorization: value },
          })
        ).status,
      ).toBe(401);
    expect(
      (
        await fetch(base, {
          headers: {
            host: 'attacker.test',
            authorization,
            'x-forwarded-host': 'ghostqa.example',
          },
        })
      ).status,
    ).toBe(403);
    expect(
      (await fetch(base + '/healthz', { headers: { host: 'ghostqa.example' } }))
        .status,
    ).toBe(200);
    expect(
      (
        await fetch(base + '/healthz?bypass=1', {
          headers: { host: 'ghostqa.example' },
        })
      ).status,
    ).toBe(401);
    expect(handled).toBe(0);
    const allowed = await fetch(base + '/api/projects', {
      headers: {
        host: 'ghostqa.example',
        authorization,
        'x-forwarded-proto': 'http',
        forwarded: 'host=attacker.test;proto=http',
      },
    });
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ proto: 'https', forwarded: null });
    expect(handled).toBe(1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('hosted password and direct database URL are sanitized from documentation', () => {
  const vault = documentationVault({
    ...env,
    DATABASE_URL_UNPOOLED: 'postgresql://secret@db.example/neondb',
  });
  try {
    const sanitized = JSON.stringify(
      vault.sanitize({
        password,
        url: 'postgresql://secret@db.example/neondb',
      }),
    );
    expect(sanitized).not.toContain(password);
    expect(sanitized).not.toContain('postgresql://secret@');
  } finally {
    vault.discard();
  }
});
