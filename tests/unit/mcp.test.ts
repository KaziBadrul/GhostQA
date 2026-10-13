import { describe, it, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { once } from 'node:events';
import {
  createExecutor,
  configuredDestination,
  type Manifest,
} from '../../src/server/mcp/runtime';
import { ConversionSchema } from '../../src/server/mcp/contracts';
import {
  createManifest,
  supportReasons,
  toolDefinition,
} from '../../src/server/mcp/generator';
import { processNotes } from '../../src/server/mcp/notes';
import { validInput } from '../../src/engine/openapi/schemas';
import { assertSafeDocumentation } from '../../src/server/mcp/documentation';
import type { ApiModel, ApiOperation } from '../../src/engine/contracts';
const operation: ApiOperation = {
  id: 'GET /items/{id}',
  method: 'GET',
  pathTemplate: '/items/{id}',
  eligible: true,
  exclusionReasons: [],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      style: 'simple',
      explode: false,
      sensitive: false,
    },
  ],
  responses: {},
};
function manifest(baseUrl: string): Manifest {
  return {
    name: 'test',
    baseUrl,
    openapiVersion: '3.1.0',
    auth: { type: 'none' },
    tools: [toolDefinition(operation)],
    importantNotes: [],
  };
}
const args = (id: string) => ({ path: { id } });
async function withTarget(
  action: (
    baseUrl: string,
    requests: { path: string; auth?: string; body: string }[],
  ) => Promise<void>,
) {
  const requests: { path: string; auth?: string; body: string }[] = [];
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += String(chunk);
    requests.push({
      path: request.url!,
      auth: request.headers.authorization,
      body,
    });
    if (request.url?.includes('redirect')) {
      response.writeHead(302, { location: '/escaped' }).end();
      return;
    }
    if (request.url?.includes('oversize')) {
      response.writeHead(200).end('x'.repeat(1024 * 1024 + 1));
      return;
    }
    if (request.url?.includes('error')) {
      response.writeHead(500).end('SECRET_TOKEN_VALUE');
      return;
    }
    if (request.url?.includes('slow')) return;
    response.writeHead(200, { 'content-type': 'application/json' }).end(
      JSON.stringify({
        path: request.url,
        authorization: request.headers.authorization,
      }),
    );
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('NO ADDRESS');
  try {
    await action(`http://127.0.0.1:${address.port}/prefix`, requests);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
}
describe('MCP boundaries', () => {
  it('preserves local references and property names inside independent schema roots', () => {
    const root = {
      components: {
        schemas: {
          description: { type: 'string', minLength: 2, example: 'withheld' },
        },
      },
      $defs: {
        selected: {
          type: 'object',
          properties: {
            description: { $ref: '#/components/schemas/description' },
          },
          required: ['description'],
          additionalProperties: false,
        },
      },
      $ref: '#/$defs/selected',
    };
    const tool = toolDefinition({ ...operation, requestBody: root });
    expect(
      validInput(
        tool.inputSchema as import('../../src/engine/contracts').Json,
        { path: { id: 'ok' }, body: { description: 'valid' } },
      ),
    ).toBe(true);
    expect(
      validInput(
        tool.inputSchema as import('../../src/engine/contracts').Json,
        { path: { id: 'ok' }, body: { description: 'x' } },
      ),
    ).toBe(false);
    expect(JSON.stringify(tool.inputSchema)).not.toContain('withheld');
  });
  it('withholds known configured credentials from documentation and model input', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'known-documentation-secret');
    try {
      expect(() =>
        assertSafeDocumentation({ notes: 'Key: known-documentation-secret' }),
      ).toThrow('SECRET IN DOCUMENTATION');
      let received = '';
      await processNotes('Key: known-documentation-secret', {
        process: async (notes) => {
          received = notes;
          return [];
        },
      });
      expect(received).not.toContain('known-documentation-secret');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('validates fixed destinations before normalization', () => {
    for (const value of [
      'https://user:secret@example.com',
      'https://example.com/?token=secret',
      'https://example.com/#x',
      'file:///tmp',
      'http://example.com/../admin',
      'http://example.com/%252e%252e',
      'http://example.com/a%2fb',
    ])
      expect(() => configuredDestination(value)).toThrow();
    expect(configuredDestination('http://127.0.0.1:4010/api').pathname).toBe(
      '/api',
    );
  });
  it('rejects invalid arguments and path escapes before dispatch, preserves base path, and rejects redirects', async () => {
    await withTarget(async (baseUrl, requests) => {
      const m = manifest(baseUrl),
        execute = createExecutor(m),
        name = m.tools[0]!.name;
      for (const value of [
        {},
        args('..'),
        args('%252e%252e'),
        args('a/b'),
        args('https://evil.test'),
        { ...args('ok'), url: 'https://evil.test' },
        { path: { id: 123 } },
      ])
        expect((await execute(name, value)).isError).toBe(true);
      expect(requests).toHaveLength(0);
      expect((await execute('unknown', {})).isError).toBe(true);
      const abort = new AbortController();
      abort.abort();
      expect((await execute(name, args('ok'), abort.signal)).isError).toBe(
        true,
      );
      expect(requests).toHaveLength(0);
      expect((await execute(name, args('ok'))).isError).not.toBe(true);
      expect(requests[0]?.path).toBe('/prefix/items/ok');
      expect(JSON.stringify(await execute(name, args('redirect')))).toContain(
        'REDIRECT REJECTED',
      );
      expect(requests).toHaveLength(2);
      expect(JSON.stringify(await execute(name, args('oversize')))).toContain(
        'RESPONSE LIMIT',
      );
    });
  });
  it('serializes query arrays and JSON bodies with unchanged schema validation', async () => {
    await withTarget(async (baseUrl, requests) => {
      const op: ApiOperation = {
        ...operation,
        id: 'POST /items/{id}',
        method: 'POST',
        parameters: [
          ...operation.parameters,
          {
            name: 'tags',
            in: 'query',
            required: true,
            schema: { type: 'array', items: { type: 'integer' } },
            style: 'form',
            explode: true,
            sensitive: false,
          },
        ],
        requestBody: {
          type: 'object',
          properties: { count: { type: 'integer', minimum: 1 } },
          required: ['count'],
          additionalProperties: false,
        },
      };
      const m = { ...manifest(baseUrl), tools: [toolDefinition(op)] },
        execute = createExecutor(m);
      expect(
        (
          await execute(m.tools[0]!.name, {
            ...args('ok'),
            query: { tags: [1, 2] },
            body: { count: '1' },
          })
        ).isError,
      ).toBe(true);
      expect(requests).toHaveLength(0);
      expect(
        (
          await execute(m.tools[0]!.name, {
            ...args('ok'),
            query: { tags: [1, 2] },
            body: { count: 1 },
          })
        ).isError,
      ).not.toBe(true);
      expect(requests[0]?.path).toBe('/prefix/items/ok?tags=1&tags=2');
      expect(requests[0]?.body).toBe('{"count":1}');
    });
  });
  it('withholds error bodies and redacts configured credentials', async () => {
    await withTarget(async (baseUrl, requests) => {
      const m = { ...manifest(baseUrl), auth: { type: 'bearer' as const } };
      expect(() => createExecutor(m, {})).toThrow();
      expect(() =>
        createExecutor(m, { API_BEARER_TOKEN: 'bad\r\nheader' }),
      ).toThrow();
      const execute = createExecutor(m, {
        API_BEARER_TOKEN: 'SECRET_TOKEN_VALUE',
      });
      const result = await execute(m.tools[0]!.name, args('ok'));
      expect(requests[0]?.auth).toBe('Bearer SECRET_TOKEN_VALUE');
      expect(JSON.stringify(result)).not.toContain('SECRET_TOKEN_VALUE');
      expect(JSON.stringify(result)).toContain('[REDACTED]');
      const failure = await execute(m.tools[0]!.name, args('error'));
      expect(JSON.stringify(failure)).not.toContain('SECRET_TOKEN_VALUE');
    });
  });
  it('aborts in-flight work without retrying mutations', async () => {
    await withTarget(async (baseUrl, requests) => {
      const m = manifest(baseUrl),
        execute = createExecutor(m),
        abort = new AbortController();
      const pending = execute(m.tools[0]!.name, args('slow'), abort.signal);
      setTimeout(() => abort.abort(), 50);
      expect(JSON.stringify(await pending)).toContain('CANCELLED');
      expect(requests).toHaveLength(1);
    });
  });
  it('times out without retries', async () => {
    await withTarget(async (baseUrl, requests) => {
      const m = manifest(baseUrl);
      expect(
        JSON.stringify(await createExecutor(m)(m.tools[0]!.name, args('slow'))),
      ).toContain('TIMEOUT');
      expect(requests).toHaveLength(1);
    });
  }, 15000);
  it('excludes unsupported operations and produces stable unique names', () => {
    expect(
      supportReasons({
        ...operation,
        eligible: false,
        exclusionReasons: ['UNSUPPORTED MEDIA TYPE'],
      }),
    ).toContain('UNSUPPORTED MEDIA TYPE');
    expect(
      supportReasons({
        ...operation,
        parameters: [{ ...operation.parameters[0]!, in: 'header' }],
      }).join(' '),
    ).toContain('Header parameters');
    expect(toolDefinition(operation).name).not.toBe(
      toolDefinition({
        ...operation,
        id: 'GET /items-id',
        pathTemplate: '/items-id',
      }).name,
    );
    expect(toolDefinition(operation).name).toBe(toolDefinition(operation).name);
    const schemaOp = {
      ...operation,
      requestBody: {
        type: 'object',
        const: { description: 'must survive', default: 'value' },
        properties: {
          description: {
            type: 'string',
            description: 'annotation',
            default: 'withheld',
          },
        },
      },
    };
    const schema = toolDefinition(schemaOp).inputSchema;
    expect(JSON.stringify(schema)).toContain('must survive');
    expect(JSON.stringify(schema)).not.toContain('withheld');
  });
  it('does not export source annotations or credential-bearing schemas', () => {
    const model: ApiModel = {
      snapshotId: 'a',
      contentHash: 'b',
      openapiVersion: '3.1.0',
      operations: [
        {
          ...operation,
          parameters: [
            {
              ...operation.parameters[0]!,
              schema: {
                type: 'string',
                example: 'secret-example',
                description: 'secret-description',
              },
            },
          ],
        },
      ],
      importDiagnostics: [],
    };
    const input = {
      source: 'x',
      name: 'test',
      baseUrl: 'http://localhost:4010',
      operationIds: [operation.id],
      auth: { type: 'none' as const },
      originalNotes: '',
      importantNotes: [],
      notesApproved: true as const,
    };
    const result = createManifest(model, input);
    expect(JSON.stringify(result)).not.toContain('secret-example');
    expect(JSON.stringify(result)).not.toContain('secret-description');
    expect(() =>
      createManifest(model, { ...input, operationIds: ['invented'] }),
    ).toThrow();
    expect(
      ConversionSchema.safeParse({
        ...input,
        auth: { type: 'bearer', token: 'raw-secret' },
      }).success,
    ).toBe(false);
    expect(
      ConversionSchema.safeParse({
        ...input,
        auth: { type: 'apiKey', header: 'Host' },
      }).success,
    ).toBe(false);
  });
  it('keeps models limited to structured notes, preserving original notes on failure', async () => {
    const original = 'Use the order ID returned by creation.';
    expect(
      (
        await processNotes(original, {
          process: async () => [{ title: 'Orders', detail: original }],
        })
      ).status,
    ).toBe('processed');
    const failed = await processNotes(original, {
      process: async () => {
        throw Error('quota exhausted');
      },
    });
    expect(failed.status).toBe('fallback');
    expect(failed.original).toBe(original);
    const malicious = await processNotes(original, {
      process: async () => [{ title: 'Run', detail: 'x', code: 'fetch evil' }],
    });
    expect(malicious.status).toBe('fallback');
  });
});
