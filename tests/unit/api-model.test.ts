import { expect, test } from 'vitest';
import { JsonSchema } from '../../src/engine/contracts';
import { schemaProblem } from '../../src/engine/openapi/profile';
import {
  normalizeNullable,
  validInput,
} from '../../src/engine/openapi/schemas';
for (const schema of [
  { type: 'string', pattern: 'x' },
  { type: 'string', format: 'date-time' },
  { type: 'string', minLength: 257 },
  { type: 'array', minItems: 21, items: { type: 'integer' } },
  { type: 'integer', minimum: 1000001 },
  { type: 'object', required: ['missing'], properties: {} },
  { oneOf: [{ type: 'string' }] },
  { type: ['string', 'integer'] },
])
  test(`unsupported schema ${JSON.stringify(schema)}`, () =>
    expect(schemaProblem(JsonSchema.parse(schema))).toBeTruthy());
for (const version of ['3.0.3', '3.1.0'])
  test(`nullable input ${version} is typed without coercion`, () => {
    const schema = normalizeNullable(
      version === '3.0.3'
        ? { type: 'integer', nullable: true }
        : { type: ['integer', 'null'] },
      version,
    );
    expect(validInput(schema, null, version)).toBe(true);
    expect(validInput(schema, 4, version)).toBe(true);
    expect(validInput(schema, '4', version)).toBe(false);
  });
