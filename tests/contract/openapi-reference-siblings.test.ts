import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import { validInput } from '../../src/engine/openapi/schemas';

test('OpenAPI 3.1 reference siblings never widen referenced constraints', async () => {
  const text = await readFile(
    new URL('../fixtures/openapi/reference-siblings-3.1.json', import.meta.url),
    'utf8',
  );
  const model = await parseOpenApi(text);
  const operation = model.operations[0];
  expect(operation?.eligible).toBe(true);
  expect(operation?.requestBody).toBeDefined();
  if (!operation?.requestBody) throw new Error('Missing request schema');
  expect(validInput(operation.requestBody, { name: '12345678' }, '3.1.0')).toBe(
    true,
  );
  // The referenced maxLength:8 and sibling maxLength:20 both apply.
  expect(
    validInput(operation.requestBody, { name: '123456789' }, '3.1.0'),
  ).toBe(false);
});
