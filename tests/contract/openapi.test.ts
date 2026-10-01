import { expect, test, vi } from 'vitest';
import { stringify } from 'yaml';
import { parseOpenApi } from '../../src/engine/openapi/parse';
export const document = (version = '3.1.0') => ({
  openapi: version,
  info: { title: 'Neutral', version: '1' },
  servers: [
    { url: 'http://untrusted.invalid' },
    { url: 'http://other.invalid' },
  ],
  paths: {
    '/api/items': {
      post: {
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string', maxLength: 64 } },
                required: ['name'],
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { id: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  },
});
for (const version of ['3.0.3', '3.1.0'])
  for (const format of ['JSON', 'YAML'])
    test(`${version} ${format} imports without server authority`, async () => {
      const model = await parseOpenApi(
        format === 'JSON'
          ? JSON.stringify(document(version))
          : stringify(document(version)),
      );
      expect(model.operations[0]?.eligible).toBe(true);
      expect(model.operations[0]?.id).toBe('POST /api/items');
      expect(JSON.stringify(model)).not.toContain('untrusted.invalid');
    });
test('duplicate keys, tags, aliases and invalid document are rejected', async () => {
  for (const text of [
    'openapi: 3.1.0\nopenapi: 3.0.3',
    'a: !custom x',
    'a: &a {x: 1}\nb: *a',
    '{}',
    '[]',
    '{"openapi":"3.2.0"}',
  ])
    await expect(parseOpenApi(text)).rejects.toThrow('INVALID OPENAPI');
});
for (const reference of [
  'https://outside.invalid/schema',
  'file:///etc/passwd',
  '#/components/schemas/Missing',
])
  test(`reference ${reference} excludes affected operation without external I/O`, async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Forbidden'));
    try {
      const d = document();
      Object.assign(
        d.paths['/api/items'].post.requestBody.content['application/json']
          .schema,
        { $ref: reference },
      );
      const model = await parseOpenApi(JSON.stringify(d));
      expect(model.operations[0]?.eligible).toBe(false);
      expect(model.operations[0]?.exclusionReasons.length).toBeGreaterThan(0);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
test('recursive/composed schema excludes only affected operation; internal refs work', async () => {
  const d = {
    ...document(),
    components: {
      schemas: {
        Name: { type: 'string', maxLength: 64 },
        Loop: { $ref: '#/components/schemas/Loop' },
      },
    },
  };
  d.paths['/api/items'].post.requestBody.content[
    'application/json'
  ].schema.properties.name = { $ref: '#/components/schemas/Name' } as never;
  let model = await parseOpenApi(JSON.stringify(d));
  expect(model.operations[0]?.eligible).toBe(true);
  d.paths['/api/items'].post.requestBody.content[
    'application/json'
  ].schema.properties.name = { $ref: '#/components/schemas/Loop' } as never;
  model = await parseOpenApi(JSON.stringify(d));
  expect(model.operations[0]?.eligible).toBe(false);
});
test('missing required info.version is rejected rather than parser repaired', async () => {
  const d = document();
  delete (d.info as { version?: string }).version;
  await expect(parseOpenApi(JSON.stringify(d))).rejects.toThrow(
    'INVALID OPENAPI',
  );
});
test('oversized import is rejected before worker creation', async () => {
  await expect(parseOpenApi(' '.repeat(2 * 1024 * 1024 + 1))).rejects.toThrow(
    'IMPORT TOO LARGE',
  );
});
