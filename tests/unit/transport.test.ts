import { readFile } from 'node:fs/promises';
import { createServer as createHttpsServer } from 'node:https';
import type { AddressInfo } from 'node:net';
import { expect, test } from 'vitest';
import { targetServer } from '../helpers/target-server';
import { createHttpExecutor } from '../../src/engine/execution/http-executor';
const address = { ip: '127.0.0.1', family: 4 as const };
test('pins address while preserving original Host and never follows redirects', async () => {
  let calls = 0;
  const target = await targetServer((req, res) => {
    calls++;
    expect(req.headers.host).toBe(`original.invalid:${target.port}`);
    res.writeHead(302, { Location: 'http://other.invalid/escape' });
    res.end();
  });
  try {
    const result = await createHttpExecutor()({
      url: new URL(`http://original.invalid:${target.port}/api`),
      address,
      method: 'GET',
      headers: {},
      signal: new AbortController().signal,
      timeoutMs: 1000,
    });
    expect(result.status).toBe(302);
    expect(calls).toBe(1);
  } finally {
    await target.close();
  }
});
test('absolute deadline aborts a target that never responds; no retry', async () => {
  let calls = 0;
  const target = await targetServer(() => {
    calls++;
  });
  try {
    await expect(
      createHttpExecutor()({
        url: new URL(`http://original.invalid:${target.port}/api`),
        address,
        method: 'POST',
        headers: {},
        signal: new AbortController().signal,
        timeoutMs: 20,
      }),
    ).rejects.toThrow('REQUEST TIMEOUT');
    expect(calls).toBe(1);
  } finally {
    await target.close();
  }
});
test('cancellation aborts in-flight transport', async () => {
  const controller = new AbortController();
  const target = await targetServer(() => controller.abort());
  try {
    await expect(
      createHttpExecutor()({
        url: new URL(`http://original.invalid:${target.port}/api`),
        address,
        method: 'GET',
        headers: {},
        signal: controller.signal,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow('CANCELLED');
  } finally {
    await target.close();
  }
});
test('rejects compressed response and never parses truncated JSON', async () => {
  const target = await targetServer((_req, res) => {
    res.writeHead(200, { 'Content-Encoding': 'gzip' });
    res.end('compressed');
  });
  try {
    await expect(
      createHttpExecutor()({
        url: new URL(`http://original.invalid:${target.port}/api`),
        address,
        method: 'GET',
        headers: {},
        signal: new AbortController().signal,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow('UNSUPPORTED COMPRESSION');
  } finally {
    await target.close();
  }
});
test('caps responses with truncation', async () => {
  const target = await targetServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('x'.repeat(1048577));
  });
  try {
    const result = await createHttpExecutor()({
      url: new URL(`http://original.invalid:${target.port}/api`),
      address,
      method: 'GET',
      headers: {},
      signal: new AbortController().signal,
      timeoutMs: 1000,
    });
    expect(result.truncated).toBe(true);
    expect(result.body).toBeNull();
  } finally {
    await target.close();
  }
});

test('TLS preserves SNI and validates certificate identity before HTTP payload', async () => {
  const ca = await readFile(
    new URL('../fixtures/tls/test-ca.pem', import.meta.url),
  );
  const key = await readFile(
    new URL('../fixtures/tls/test-only-key.pem', import.meta.url),
  );
  let calls = 0;
  let seenSni = '';
  const server = createHttpsServer({ key, cert: ca }, (_req, res) => {
    calls++;
    res.end('ok');
  });
  server.on('secureConnection', (socket) => {
    seenSni = socket.servername || '';
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  try {
    const result = await createHttpExecutor(ca)({
      url: new URL(`https://original.invalid:${port}/api`),
      address,
      method: 'GET',
      headers: {},
      signal: new AbortController().signal,
      timeoutMs: 1000,
    });
    expect(result.status).toBe(200);
    expect(seenSni).toBe('original.invalid');
    await expect(
      createHttpExecutor(ca)({
        url: new URL(`https://wrong.invalid:${port}/api`),
        address,
        method: 'POST',
        headers: {},
        body: { mutating: true },
        signal: new AbortController().signal,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow();
    expect(calls).toBe(1);
    await expect(
      createHttpExecutor()({
        url: new URL(`https://original.invalid:${port}/api`),
        address,
        method: 'GET',
        headers: {},
        signal: new AbortController().signal,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
test('oversized request and reserved headers fail before target dispatch', async () => {
  let calls = 0;
  const target = await targetServer((_req, res) => {
    calls++;
    res.end();
  });
  try {
    const input = {
      url: new URL(`http://original.invalid:${target.port}/api`),
      address,
      method: 'POST',
      headers: {},
      signal: new AbortController().signal,
      timeoutMs: 1000,
    };
    await expect(
      createHttpExecutor()({ ...input, body: 'x'.repeat(1048576) }),
    ).rejects.toThrow('REQUEST LIMIT');
    expect(() =>
      createHttpExecutor()({ ...input, headers: { Host: 'escape' } }),
    ).toThrow('RESERVED HEADER');
    expect(calls).toBe(0);
  } finally {
    await target.close();
  }
});
test('literal destination mismatch rejects before socket creation', async () =>
  await expect(
    createHttpExecutor()({
      url: new URL('http://127.0.0.2:1/api'),
      address,
      method: 'POST',
      headers: {},
      signal: new AbortController().signal,
      timeoutMs: 1000,
    }),
  ).rejects.toThrow('PIN MISMATCH'));
