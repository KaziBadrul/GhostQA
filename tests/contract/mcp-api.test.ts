import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import { installApplication } from '../../src/server/application-runtime';
import { createManifest } from '../../src/server/mcp/generator';
import { createExecutor } from '../../src/server/mcp/runtime';
import { validInput } from '../../src/engine/openapi/schemas';
import { POST } from '../../src/app/api/mcp/route';
const token = 'a'.repeat(64);
function request(value: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin,
      cookie: `ghostqa-setup=${token}`,
      'x-ghostqa-csrf': token,
      'content-type': 'application/json',
    },
    body: JSON.stringify(value),
  });
}
const input = {
  name: 'Orders',
  baseUrl: 'http://127.0.0.1:4010',
  operationIds: ['POST /api/orders', 'GET /api/orders/{orderId}'],
  auth: { type: 'none' },
  originalNotes: 'Use returned IDs.',
  importantNotes: [{ title: 'IDs', detail: 'Use returned IDs.' }],
  notesApproved: true,
};
describe('MCP application boundary', () => {
  it('preserves required and optional JSON body declarations', async () => {
    for (const required of [true, false]) {
      const source = JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Bodies', version: '1' },
        paths: {
          '/items': {
            post: {
              requestBody: {
                required,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: { count: { type: 'integer' } },
                      required: ['count'],
                      additionalProperties: false,
                    },
                  },
                },
              },
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      });
      const model = await parseOpenApi(source);
      expect(model.operations[0]!.requestBodyRequired).toBe(required);
      const manifest = createManifest(model, {
        ...input,
        auth: { type: 'none' },
        source,
        operationIds: ['POST /items'],
        notesApproved: true,
      });
      expect(
        validInput(
          manifest.tools[0]!
            .inputSchema as import('../../src/engine/contracts').Json,
          {},
          model.openapiVersion,
        ),
      ).toBe(!required);
      expect(
        validInput(
          manifest.tools[0]!
            .inputSchema as import('../../src/engine/contracts').Json,
          { body: { count: 'bad' } },
          model.openapiVersion,
        ),
      ).toBe(false);
      expect(typeof createExecutor(manifest)).toBe('function');
    }
  });

  it('requires local same-origin CSRF authorization', async () => {
    expect((await POST(request({}, 'https://evil.example'))).status).toBe(403);
    const req = request({});
    req.headers.delete('x-ghostqa-csrf');
    expect((await POST(req)).status).toBe(403);
  });
  it('previews and packages the Orders specification without reset or invariant configuration', async () => {
    const source = await readFile('examples/orders.openapi.json', 'utf8');
    const preview = await POST(request({ action: 'preview', source }));
    expect(preview.status).toBe(200);
    expect((await preview.json()).operations).toHaveLength(6);
    const response = await POST(request({ ...input, source }));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/gzip');
    expect(response.headers.get('content-disposition')).toContain(
      'api-mcp-server.tar.gz',
    );
    const archive = gunzipSync(
      Buffer.from(await response.arrayBuffer()),
    ).toString('utf8');
    expect(archive).toContain('notes://important');
    expect(archive).toContain('Use returned IDs.');
    expect(archive).not.toContain(process.env.GEMINI_API_KEY);
  });
  it('rejects raw credentials, unapproved notes, invented selections, and credential-bearing destinations', async () => {
    const source = await readFile('examples/orders.openapi.json', 'utf8');
    for (const change of [
      { auth: { type: 'bearer', token: 'secret' } },
      { notesApproved: false },
      { baseUrl: 'http://user:secret@localhost:4010' },
      { operationIds: ['GET /invented'] },
    ]) {
      expect(
        (await POST(request({ ...input, source, ...change }))).status,
      ).toBeGreaterThanOrEqual(400);
    }
  });
  it('reuses the saved sanitized specification without reading credential slots', async () => {
    const model = await parseOpenApi(
      await readFile('examples/orders.openapi.json', 'utf8'),
    );
    const command = vi.fn(async () => ({ project: { specification: model } }));
    installApplication({ command, shutdown: async () => {} });
    const projectId = '11111111-1111-4111-8111-111111111111';
    expect((await POST(request({ ...input, projectId }))).status).toBe(200);
    expect(command).toHaveBeenCalledExactlyOnceWith('get', projectId);
  });
  it('reports unsupported profile operations and rejects duplicate YAML keys', async () => {
    const source =
      'openapi: 3.0.3\ninfo: {title: Upload, version: "1"}\npaths:\n  /upload:\n    post:\n      requestBody:\n        content:\n          multipart/form-data:\n            schema: {type: object}\n      responses: {"200": {description: OK}}\n';
    const response = await POST(request({ action: 'preview', source }));
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).toContain(
      'UNSUPPORTED MEDIA TYPE',
    );
    expect(
      (
        await POST(
          request({ action: 'preview', source: source + 'paths: {}\n' }),
        )
      ).status,
    ).toBe(422);
  });
});
