import { expect, test } from 'vitest';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import { validInput } from '../../src/engine/openapi/schemas';
test('sensitive schema enum is withheld with explicit exclusion instead of changed validation authority', async () => {
  const d = {
    openapi: '3.1.0',
    info: { title: 'Neutral', version: '1' },
    paths: {
      '/api/create': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    password: { type: 'string', enum: ['raw-planted-secret'] },
                  },
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
  expect(model.operations[0]!.eligible).toBe(false);
  expect(model.operations[0]!.exclusionReasons).toContain(
    'SECRET SCHEMA CONSTRAINT WITHHELD',
  );
  expect(JSON.stringify(model)).not.toContain('raw-planted-secret');
});
test('schema properties named nullable/default remain declared fields', async () => {
  const d = {
    openapi: '3.0.3',
    info: { title: 'Neutral', version: '1' },
    paths: {
      '/api/create': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nullable: { type: 'string' },
                    default: { type: 'integer' },
                  },
                  required: ['nullable', 'default'],
                  additionalProperties: false,
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
  expect(model.operations[0]!.eligible).toBe(true);
  expect(
    validInput(
      model.operations[0]!.requestBody!,
      { nullable: 'value', default: 1 },
      '3.0.3',
    ),
  ).toBe(true);
  expect(
    validInput(
      model.operations[0]!.requestBody!,
      { nullable: 'value' },
      '3.0.3',
    ),
  ).toBe(false);
});
