import { expect, test, vi } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { stringify } from 'yaml';
import { JsonSchema, type Json } from '../../src/engine/contracts';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import { parseDocumentInMemory } from '../../src/engine/openapi/document';
import { validInput, preserveSchema } from '../../src/engine/openapi/schemas';
function api(schema: Json, components: Json = {}, version = '3.1.0'): Json {
  return {
    openapi: version,
    info: { title: 'Neutral', version: '1' },
    components: { schemas: components },
    paths: {
      '/api/items': {
        post: {
          requestBody: {
            required: true,
            content: { 'application/json': { schema } },
          },
          responses: { '200': { description: 'Result' } },
        },
      },
      '/api/read': { get: { responses: { '200': { description: 'Result' } } } },
    },
  };
}
for (const [base, sibling, good, bad] of [
  [
    { type: 'string', maxLength: 8 },
    { maxLength: 20 },
    '12345678',
    '123456789',
  ],
  [
    { type: 'string', maxLength: 20 },
    { maxLength: 8 },
    '12345678',
    '123456789',
  ],
  [{ type: 'string', minLength: 3 }, { maxLength: 8 }, 'abc', 'ab'],
  [{ type: 'integer', minimum: 3 }, { maximum: 8 }, 5, 9],
] as const)
  test(`both constraints remain authoritative ${JSON.stringify(base)} ${JSON.stringify(sibling)}`, async () => {
    const model = await parseOpenApi(
      JSON.stringify(
        api(
          { $ref: '#/components/schemas/Base', ...sibling },
          JsonSchema.parse({ Base: base }),
        ),
      ),
    );
    const operation = model.operations.find((o) => o.method === 'POST')!;
    expect(operation.eligible).toBe(true);
    expect(validInput(operation.requestBody!, good)).toBe(true);
    expect(validInput(operation.requestBody!, bad)).toBe(false);
    expect(JSON.stringify(operation.requestBody)).toContain(
      '#/components/schemas/Base',
    );
  });
test('internal chains retain every sibling and original field names', async () => {
  const model = await parseOpenApi(
    JSON.stringify(
      api(
        { $ref: '#/components/schemas/Middle', maxLength: 20 },
        {
          Base: { type: 'string', minLength: 3, maxLength: 8 },
          Middle: { $ref: '#/components/schemas/Base', minLength: 4 },
        },
      ),
    ),
  );
  const schema = model.operations.find(
    (o) => o.method === 'POST',
  )!.requestBody!;
  expect(validInput(schema, 'abcd')).toBe(true);
  for (const value of ['abc', '123456789'])
    expect(validInput(schema, value)).toBe(false);
});
test('response schema validation preserves siblings without requiring generation of response format', async () => {
  const d = api({ type: 'string' });
  const root = d as Record<string, Json>;
  root.components = { schemas: { Base: { type: 'string', maxLength: 8 } } };
  const paths = root.paths as Record<string, Json>;
  const post = (paths['/api/items'] as Record<string, Json>).post as Record<
    string,
    Json
  >;
  post.responses = {
    '200': {
      description: 'Result',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Base', maxLength: 20 },
        },
      },
    },
  };
  const model = await parseOpenApi(JSON.stringify(d));
  const response = (model.operations[0]!.responses as Record<string, Json>)[
    '200'
  ] as Record<string, Json>;
  const schema = (
    (response.content as Record<string, Json>)['application/json'] as Record<
      string,
      Json
    >
  ).schema!;
  expect(validInput(schema, '123456789')).toBe(false);
});
test('recursive generation schemas are explicitly excluded; Ajv internal recursion needs no loader', async () => {
  const raw: Json = {
    type: 'object',
    properties: { next: { $ref: '#' } },
    additionalProperties: false,
  };
  const ajv = new Ajv2020();
  expect(ajv.validate(raw as object, { next: {} })).toBe(true);
  const model = await parseOpenApi(
    JSON.stringify(
      api(
        { $ref: '#/components/schemas/Loop' },
        {
          Loop: {
            type: 'object',
            properties: { next: { $ref: '#/components/schemas/Loop' } },
          },
        },
      ),
    ),
  );
  expect(model.operations[0]!.exclusionReasons).toContain(
    'RECURSIVE REFERENCE',
  );
  expect(model.operations[1]!.eligible).toBe(true);
  expect(() =>
    preserveSchema(
      { $ref: '#/components/schemas/Loop' },
      api({}, { Loop: { $ref: '#/components/schemas/Loop' } }),
      '3.1.0',
    ),
  ).toThrow('RECURSIVE REFERENCE');
});
for (const schema of [
  { type: 'string', pattern: 'x' },
  { oneOf: [{ type: 'string' }, { type: 'integer' }] },
  { type: ['string', 'integer'] },
  { type: 'object' },
  { type: 'string', format: 'custom' },
  { type: 'string', $schema: 'https://untrusted.invalid/dialect' },
])
  test(`unsupported schema fails closed ${JSON.stringify(schema)}`, async () => {
    const model = await parseOpenApi(
      JSON.stringify(api(JsonSchema.parse(schema))),
    );
    expect(model.operations[0]!.eligible).toBe(false);
    expect(model.operations[0]!.exclusionReasons.length).toBeGreaterThan(0);
    expect(model.operations[1]!.eligible).toBe(true);
  });
test('remote/file reference exclusions perform zero external I/O in the actual parser function', async () => {
  const fail = () => {
    throw new Error('EXTERNAL I/O FORBIDDEN');
  };
  const spies = [
    vi.spyOn(globalThis, 'fetch').mockImplementation(fail),
    vi.spyOn(fs, 'readFileSync').mockImplementation(fail),
    vi.spyOn(fsp, 'readFile').mockImplementation(fail),
    vi.spyOn(http, 'request').mockImplementation(fail),
    vi.spyOn(https, 'request').mockImplementation(fail),
    vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(fail),
  ];
  try {
    for (const ref of [
      'https://outside.invalid/schema',
      'file:///private/tmp/ghostqa-secret',
      '#/components/schemas/Missing',
    ]) {
      const model = await parseDocumentInMemory(
        JSON.stringify(api({ $ref: ref })),
      );
      expect(model.operations[0]!.eligible).toBe(false);
      expect(model.operations[1]!.eligible).toBe(true);
    }
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  } finally {
    spies.forEach((s) => s.mockRestore());
  }
});
for (const version of ['3.0.3', '3.1.0'])
  test(`nullable and serialization support matrix ${version}`, async () => {
    const d = api(
      version === '3.0.3'
        ? { type: 'string', nullable: true }
        : { type: ['string', 'null'] },
      {},
      version,
    );
    const model = await parseOpenApi(stringify(d));
    const schema = model.operations[0]!.requestBody!;
    expect(validInput(schema, null, version)).toBe(true);
    expect(validInput(schema, 3, version)).toBe(false);
  });
test('bounded YAML aliases work; merge keys and explosive expansion fail closed', async () => {
  const yaml =
    'openapi: 3.1.0\ninfo: {title: Neutral, version: "1"}\npaths:\n  /api/a:\n    get: &operation\n      responses: {"200": {description: Result}}\n  /api/b:\n    get: *operation\n';
  expect((await parseOpenApi(yaml)).operations.every((o) => o.eligible)).toBe(
    true,
  );
  await expect(
    parseOpenApi(yaml.replace('get: *operation', 'get:\n      <<: *operation')),
  ).rejects.toThrow('INVALID OPENAPI');
});
test('expanded node and schema depth limits are enforced', async () => {
  const d = api({ type: 'string' });
  (d as Record<string, Json>)['x-data'] = Array(100001).fill(0);
  await expect(parseOpenApi(JSON.stringify(d))).rejects.toThrow(
    'INVALID OPENAPI',
  );
  let schema: Json = { type: 'string' };
  for (let i = 0; i < 11; i++)
    schema = { type: 'object', properties: { child: schema } };
  const model = await parseOpenApi(JSON.stringify(api(schema)));
  expect(model.operations[0]!.exclusionReasons).toContain('SCHEMA DEPTH LIMIT');
});
test('inconsistent generation bounds across references block operation without widening', async () => {
  const model = await parseOpenApi(
    JSON.stringify(
      api(
        { $ref: '#/components/schemas/Base', maxLength: 4 },
        { Base: { type: 'string', minLength: 8 } },
      ),
    ),
  );
  expect(model.operations[0]!.eligible).toBe(false);
  expect(model.operations[0]!.exclusionReasons).toContain(
    'STRING GENERATION LIMIT',
  );
  expect(model.operations[1]!.eligible).toBe(true);
});
