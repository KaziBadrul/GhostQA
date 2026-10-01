import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Accounts } from './account';
import { control } from './control';
export async function startFixture(repaired: boolean, port = 0) {
  const accounts = new Accounts(repaired);
  const openapi: unknown = JSON.parse(
    await readFile(new URL('../openapi/account.json', import.meta.url), 'utf8'),
  );
  const server = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const part of request) {
        bytes += part.length;
        if (bytes > 1048576) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(part);
      }
      const text = Buffer.concat(chunks).toString();
      const body: unknown = text ? JSON.parse(text) : {};
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        response.writeHead(400).end();
        return;
      }
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      const method = request.method ?? 'GET';
      if (method === 'GET' && path === '/openapi.json') {
        response
          .writeHead(200, { 'content-type': 'application/json' })
          .end(JSON.stringify(openapi));
        return;
      }
      const result =
        control(accounts, method, path) ??
        accounts.execute(method, path, body as Record<string, unknown>);
      response
        .writeHead(result.status, { 'content-type': 'application/json' })
        .end(JSON.stringify(result.body));
    } catch {
      response
        .writeHead(400, { 'content-type': 'application/json' })
        .end('{"error":"Invalid input"}');
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
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const variant = process.env.FIXTURE_VARIANT ?? 'faulty';
  if (!['faulty', 'repaired'].includes(variant))
    throw new Error('INVALID FIXTURE VARIANT');
  const repaired = variant === 'repaired';
  const fixture = await startFixture(
    repaired,
    Number(process.env.FIXTURE_PORT ?? 4010),
  );
  console.log(`Fixture listening at ${fixture.url}`);
}
