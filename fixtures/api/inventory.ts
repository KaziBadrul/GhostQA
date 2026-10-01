import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

type ItemState = 'AVAILABLE' | 'UNAVAILABLE' | 'ALLOCATED';
export async function startInventoryFixture(repaired: boolean, port = 0) {
  const items = new Map<string, ItemState>();
  const openapi: unknown = JSON.parse(
    await readFile(
      new URL('../openapi/inventory.json', import.meta.url),
      'utf8',
    ),
  );
  const server = createServer(async (request, response) => {
    const send = (status: number, body: unknown) =>
      response
        .writeHead(status, { 'content-type': 'application/json' })
        .end(JSON.stringify(body));
    try {
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 1048576) {
          send(413, { error: 'Input too large' });
          return;
        }
      }
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      const method = request.method;
      if (method === 'POST' && path === '/api/control/reset') {
        items.clear();
        send(200, { reset: true });
        return;
      }
      if (method === 'GET' && path === '/api/control/baseline') {
        send(200, { items: items.size });
        return;
      }
      if (method === 'GET' && path === '/openapi.json') {
        send(200, openapi);
        return;
      }
      if (method === 'POST' && path === '/api/items') {
        const id = randomUUID();
        items.set(id, 'AVAILABLE');
        send(201, { id, state: 'AVAILABLE' });
        return;
      }
      const match = /^\/api\/items\/([^/]+)(?:\/(unavailable|allocate))?$/.exec(
        path,
      );
      const id = match?.[1];
      const state = id ? items.get(id) : undefined;
      if (!id || !state) {
        send(404, { error: 'Not found' });
        return;
      }
      if (method === 'GET' && !match?.[2]) {
        send(200, { id, state });
        return;
      }
      if (method === 'POST' && match?.[2] === 'unavailable') {
        if (state === 'ALLOCATED') {
          send(409, { id, state });
          return;
        }
        items.set(id, 'UNAVAILABLE');
        send(200, { id, state: 'UNAVAILABLE' });
        return;
      }
      if (method === 'POST' && match?.[2] === 'allocate') {
        if (repaired && state === 'UNAVAILABLE') {
          send(409, { id, state });
          return;
        }
        items.set(id, 'ALLOCATED');
        send(200, { id, state: 'ALLOCATED' });
        return;
      }
      send(405, { error: 'Method not allowed' });
    } catch {
      if (!response.headersSent) send(400, { error: 'Invalid input' });
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('FIXTURE START FAILED');
  return {
    url: `http://127.0.0.1:${address.port}`,
    port: address.port,
    openapi,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
