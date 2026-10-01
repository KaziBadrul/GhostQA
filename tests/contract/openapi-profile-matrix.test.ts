import { expect, test } from 'vitest';
import { stringify } from 'yaml';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import { validInput } from '../../src/engine/openapi/schemas';
import { JsonSchema, type Json } from '../../src/engine/contracts';
function document(version: string, operation: Json, method = 'get'): Json {
  return {
    openapi: version,
    info: { title: 'Neutral', version: '1' },
    paths: { '/api/items/{id}': { [method]: operation } },
    components: { schemas: { Id: { type: 'string', maxLength: 64 } } },
  };
}
for (const version of ['3.0.3', '3.1.0'])
  for (const format of ['JSON', 'YAML'])
    test(`${version} ${format} all accepted methods`, async () => {
      const paths: Record<string, Json> = {};
      for (const method of [
        'get',
        'post',
        'put',
        'patch',
        'delete',
        'head',
        'options',
      ])
        paths['/api/' + method] = {
          [method]: { responses: { '200': { description: 'Result' } } },
        };
      const d: Json = {
        openapi: version,
        info: { title: 'Neutral', version: '1' },
        paths,
      };
      const model = await parseOpenApi(
        format === 'JSON' ? JSON.stringify(d) : stringify(d),
      );
      expect(model.operations).toHaveLength(7);
      expect(model.operations.every((o) => o.eligible)).toBe(true);
    });
for (const explode of [true, false])
  test(`primitive query array form explode=${explode}`, async () => {
    const d = document('3.1.0', {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { $ref: '#/components/schemas/Id' },
        },
        {
          name: 'ids',
          in: 'query',
          style: 'form',
          explode,
          schema: { type: 'array', items: { type: 'integer' }, maxItems: 20 },
        },
        { name: 'x-header', in: 'header', schema: { type: 'boolean' } },
      ],
      responses: { '200': { description: 'Result' } },
    });
    const model = await parseOpenApi(JSON.stringify(d));
    expect(model.operations[0]!.eligible).toBe(true);
    expect(
      model.operations[0]!.parameters.find((p) => p.name === 'ids')!.explode,
    ).toBe(explode);
    expect(validInput(model.operations[0]!.parameters[0]!.schema, 'x')).toBe(
      true,
    );
  });
for (const parameter of [
  {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'array', items: { type: 'string' } },
  },
  {
    name: 'id',
    in: 'path',
    required: true,
    style: 'matrix',
    schema: { type: 'string' },
  },
  {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'object', properties: { x: { type: 'string' } } },
  },
  {
    name: 'id',
    in: 'path',
    required: true,
    schema: { $ref: '#/components/schemas/Missing' },
  },
  { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
  { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
])
  test(`operation exclusions ${JSON.stringify(parameter)}`, async () => {
    const extra: Json =
      parameter.schema.type === 'string'
        ? [
            {
              name: 'ids',
              in: 'query',
              schema: { type: 'array', items: { type: 'string' } },
            },
          ]
        : [];
    const model = await parseOpenApi(
      JSON.stringify(
        document('3.1.0', {
          parameters: [JsonSchema.parse(parameter), ...(extra as Json[])],
          responses: { '200': { description: 'Result' } },
        }),
      ),
    );
    expect(model.operations[0]!.eligible).toBe(false);
    expect(model.operations[0]!.exclusionReasons.length).toBeGreaterThan(0);
  });
test('3.0 reference siblings ignored; nullable/exclusive bounds normalize explicitly', async () => {
  const d = document('3.0.3', {
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { $ref: '#/components/schemas/Id', maxLength: 1 },
      },
    ],
    responses: { '200': { description: 'Result' } },
  });
  const model = await parseOpenApi(JSON.stringify(d));
  expect(
    validInput(model.operations[0]!.parameters[0]!.schema, 'long', '3.0.3'),
  ).toBe(true);
});
test('invalid document is global failure even when another operation has prohibited references', async () => {
  const d: Json = {
    openapi: '3.0.3',
    info: { title: 'Neutral', version: '1' },
    paths: {
      '/api/good': { get: { responses: { '200': { description: 'Result' } } } },
      '/api/bad': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: 'https://outside.invalid/x' },
              },
            },
          },
          responses: { '200': {} },
        },
      },
    },
  };
  await expect(parseOpenApi(JSON.stringify(d))).rejects.toThrow(
    'INVALID OPENAPI',
  );
});
test('unsupported method and multipart body report exclusions', async () => {
  const d: Json = {
    openapi: '3.1.0',
    info: { title: 'Neutral', version: '1' },
    paths: {
      '/api/trace': {
        trace: { responses: { '200': { description: 'Result' } } },
      },
      '/api/form': {
        post: {
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: { x: { type: 'string' } },
                },
              },
            },
          },
          responses: { '200': { description: 'Result' } },
        },
      },
    },
  };
  const model = await parseOpenApi(JSON.stringify(d));
  expect(model.operations.every((o) => !o.eligible)).toBe(true);
  expect(model.importDiagnostics).toHaveLength(2);
});
