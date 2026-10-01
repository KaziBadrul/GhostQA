import { expect, test } from 'vitest';
import { JsonSchema } from '../../src/engine/contracts';
import { SecretVault } from '../../src/engine/secrets/vault';
import {
  resolveOperand,
  extract,
  pointerRead,
} from '../../src/engine/execution/variables';
import { generateValue } from '../../src/engine/execution/generate';
import { bindBody } from '../../src/engine/execution/bindings';
import { validateDependencies } from '../../src/engine/validation/dependencies';
import { makeJourney } from '../helpers/journey';
const context = () => ({
  vault: new SecretVault(),
  results: new Map(),
  inputs: { configured: 'input' },
});
test('JSON Pointer distinguishes absent, null and unavailable step', () => {
  expect(pointerRead({ x: null }, '/x')).toEqual({
    kind: 'value',
    value: null,
  });
  expect(pointerRead({}, '/x')).toEqual({ kind: 'absent' });
  expect(
    resolveOperand(
      { kind: 'json', stepId: 'missing', pointer: '/id' },
      context(),
    ),
  ).toEqual({ kind: 'unavailable' });
});
test('headers are case insensitive; status and body extraction are explicit', () => {
  const c = context();
  c.results.set('first', {
    status: 201,
    body: { id: 'fresh' },
    headers: { 'x-token': 'issued' },
    truncated: false,
  });
  expect(
    resolveOperand({ kind: 'header', stepId: 'first', name: 'X-Token' }, c),
  ).toEqual({ kind: 'value', value: 'issued' });
  expect(resolveOperand({ kind: 'status', stepId: 'first' }, c)).toEqual({
    kind: 'value',
    value: 201,
  });
  extract(
    {
      name: 'id',
      expectedType: 'string',
      source: { kind: 'json', stepId: 'first', pointer: '/id' },
      sensitive: false,
    },
    c,
  );
  expect(c.vault.get('id')).toBe('fresh');
});
test('missing, truncated and wrong-type values fail without fabricated identifier', () => {
  const c = context();
  c.results.set('first', {
    status: 200,
    body: { id: 4 },
    headers: {},
    truncated: true,
  });
  expect(
    resolveOperand({ kind: 'json', stepId: 'first', pointer: '/id' }, c),
  ).toEqual({ kind: 'unavailable' });
  expect(() =>
    extract(
      {
        name: 'id',
        expectedType: 'string',
        source: { kind: 'json', stepId: 'first', pointer: '/id' },
        sensitive: false,
      },
      c,
    ),
  ).toThrow('MISSING VALUE');
});
test('configured input and taint survive bindings', () => {
  const c = context();
  extract(
    {
      name: 'configured',
      expectedType: 'string',
      source: { kind: 'input', key: 'configured' },
      sensitive: true,
    },
    c,
  );
  expect(
    bindBody(
      { id: null },
      [{ pointer: '/id', value: { kind: 'variable', name: 'configured' } }],
      c,
    ),
  ).toEqual({ id: 'input' });
  expect(JSON.stringify(c.vault.sanitize({ echo: 'input' }))).not.toContain(
    'input',
  );
});
for (const pointer of [
  '/__proto__/x',
  '/constructor',
  '/prototype',
  'bad',
  '/missing',
])
  test(`unsafe/missing binding ${pointer}`, () =>
    expect(() =>
      bindBody(
        {},
        [{ pointer, value: { kind: 'literal', value: 'x' } }],
        context(),
      ),
    ).toThrow());
test('email and UUID regenerate each trial, bounded values conform', () => {
  for (const generator of ['email', 'uuid'] as const) {
    const schema = { type: 'string', format: generator, maxLength: 256 };
    expect(generateValue(generator, schema)).not.toBe(
      generateValue(generator, schema),
    );
  }
  expect(
    generateValue('bounded-literal', {
      type: 'integer',
      minimum: 3,
      maximum: 4,
    }),
  ).toBe(3);
});
test('out-of-profile generation rejects', () => {
  expect(() =>
    generateValue('bounded-literal', { type: 'string', pattern: 'x' }),
  ).toThrow();
});
test('backward dependencies required and forward references rejected', () => {
  const j = makeJourney();
  j.steps[0]!.parameters = [
    {
      location: 'query',
      name: 'id',
      value: { kind: 'status', stepId: 'later' },
    },
  ];
  expect(() => validateDependencies(j)).toThrow('INVALID DEPENDENCY');
});

import { preserveSchema, validInput } from '../../src/engine/openapi/schemas';
import { requestInput } from '../../src/engine/execution/requests';
test('preserved internal refs generate candidates without overwriting sibling constraints', () => {
  const document = {
    components: {
      schemas: { base: { type: 'string', minLength: 4, maxLength: 8 } },
    },
  };
  const schema = preserveSchema(
    { $ref: '#/components/schemas/base', maxLength: 20 },
    document,
    '3.1.0',
  );
  const value = generateValue('bounded-literal', schema);
  expect(validInput(schema, value)).toBe(true);
  expect(String(value).length).toBeGreaterThanOrEqual(4);
  expect(String(value).length).toBeLessThanOrEqual(8);
});
for (const schema of [
  { type: 'string', maxLength: 0 },
  { type: 'number', minimum: 0, exclusiveMaximum: 0.5 },
  { type: 'number', maximum: -3 },
  { type: 'integer', minimum: 1, maximum: 8, multipleOf: 3 },
  { type: 'array', minItems: 2, maxItems: 2, items: { type: 'boolean' } },
  {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'integer', minimum: 2 } },
  },
])
  test(`bounded generation ${JSON.stringify(schema)}`, () =>
    expect(
      validInput(
        JsonSchema.parse(schema),
        generateValue('bounded-literal', JsonSchema.parse(schema)),
      ),
    ).toBe(true));
test('enum generation tries values satisfying every constraint', () =>
  expect(
    generateValue('bounded-literal', {
      type: 'string',
      enum: ['long', 'ok'],
      maxLength: 2,
    }),
  ).toBe('ok'));
test('configured slots never resolve inherited properties', () => {
  const c = context();
  expect(() =>
    extract(
      {
        name: 'bad',
        expectedType: 'object',
        source: { kind: 'input', key: '__proto__' },
        sensitive: false,
      },
      c,
    ),
  ).toThrow('MISSING VALUE');
});
test('JSON Pointer array access rejects metadata and noncanonical indices', () => {
  for (const pointer of ['/length', '/01', '/-1', '/-'])
    expect(pointerRead(['a', 'b'], pointer).kind).not.toBe('value');
  expect(pointerRead({ 'a/b': { '~': null } }, '/a~1b/~0')).toEqual({
    kind: 'value',
    value: null,
  });
});
test('wrong extraction types fail even when the response exists', () => {
  const c = context();
  c.results.set('s', {
    status: 200,
    body: { id: 3 },
    headers: {},
    truncated: false,
  });
  expect(() =>
    extract(
      {
        name: 'id',
        expectedType: 'string',
        source: { kind: 'json', stepId: 's', pointer: '/id' },
        sensitive: false,
      },
      c,
    ),
  ).toThrow('INVALID VALUE TYPE');
});
test('explicit path query header and body bindings retain typed values and never evaluate strings', () => {
  const c = context();
  c.vault.set('id', '${process.exit()}', false);
  const step = makeJourney().steps[0]!;
  step.parameters = [
    { location: 'path', name: 'id', value: { kind: 'variable', name: 'id' } },
    { location: 'query', name: 'count', value: { kind: 'literal', value: 2 } },
    {
      location: 'header',
      name: 'X-ID',
      value: { kind: 'variable', name: 'id' },
    },
  ];
  step.body = { id: null };
  step.bodyBindings = [
    { pointer: '/id', value: { kind: 'variable', name: 'id' } },
  ];
  expect(requestInput(step, c)).toEqual({
    path: { id: '${process.exit()}' },
    query: { count: 2 },
    headers: { 'x-id': '${process.exit()}' },
    body: { id: '${process.exit()}' },
  });
});
test('missing runtime identifier stops request construction', () => {
  const step = makeJourney().steps[0]!;
  step.parameters = [
    {
      location: 'path',
      name: 'id',
      value: { kind: 'variable', name: 'unknown' },
    },
  ];
  expect(() => requestInput(step, context())).toThrow('MISSING VALUE');
});
test('overlapping body substitutions are rejected rather than order dependent', () =>
  expect(() =>
    bindBody(
      { a: { b: 1 } },
      [
        { pointer: '/a', value: { kind: 'literal', value: { b: 2 } } },
        { pointer: '/a/b', value: { kind: 'literal', value: 3 } },
      ],
      context(),
    ),
  ).toThrow());
test('taint cannot be removed by copying and trial secrets cannot be reused', () => {
  const c = context();
  c.vault.set('token', 'temporary-token', true);
  extract(
    {
      name: 'copy',
      expectedType: 'string',
      source: { kind: 'variable', name: 'token' },
      sensitive: false,
    },
    c,
  );
  expect(c.vault.isSensitive('copy')).toBe(true);
  expect(
    resolveOperand({ kind: 'variable', name: 'token' }, context()).kind,
  ).toBe('unavailable');
  c.vault.discard();
  expect(resolveOperand({ kind: 'variable', name: 'token' }, c).kind).toBe(
    'unavailable',
  );
});
test('explicit producer dependency is required for extracted variables', () => {
  const j = makeJourney();
  j.steps[0]!.extracts = [
    {
      name: 'id',
      expectedType: 'string',
      source: { kind: 'json', stepId: 'inspect', pointer: '/id' },
      sensitive: false,
    },
  ];
  j.steps.push({
    ...j.steps[0]!,
    id: 'use',
    extracts: [],
    parameters: [
      { location: 'path', name: 'id', value: { kind: 'variable', name: 'id' } },
    ],
  });
  expect(() => validateDependencies(j)).toThrow();
  j.dependencies = [{ producer: 'inspect', consumer: 'use', variable: 'id' }];
  expect(() => validateDependencies(j)).not.toThrow();
});
test('JSON null is extractable only when response parsing establishes it', () => {
  const c = context();
  c.results.set('s', {
    status: 200,
    body: null,
    text: 'null',
    headers: {},
    truncated: false,
  });
  extract(
    {
      name: 'null',
      expectedType: 'null',
      source: { kind: 'json', stepId: 's', pointer: '' },
      sensitive: false,
    },
    c,
  );
  expect(c.vault.get('null')).toBeNull();
  c.results.set('bad', {
    status: 200,
    body: null,
    text: 'not json',
    headers: {},
    truncated: false,
  });
  expect(
    resolveOperand({ kind: 'json', stepId: 'bad', pointer: '' }, c).kind,
  ).toBe('unavailable');
});
test('duplicate variable and step declarations fail before execution', () => {
  const j = makeJourney();
  j.steps.push({ ...j.steps[0]! });
  expect(() => validateDependencies(j)).toThrow('DUPLICATE STEP');
  j.steps.pop();
  const v = {
    name: 'id',
    expectedType: 'string' as const,
    source: { kind: 'input' as const, key: 'id' },
    sensitive: false,
  };
  j.variables = [v, v];
  expect(() => validateDependencies(j)).toThrow('DUPLICATE VARIABLE');
});
test('fractional exclusive bounds retain valid integer candidates', () =>
  expect(
    generateValue('bounded-literal', {
      type: 'integer',
      exclusiveMinimum: 0.2,
      exclusiveMaximum: 1.2,
    }),
  ).toBe(1));
test('nested enum values satisfy bounds and nullable values retain type', () => {
  const schema = {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: ['string', 'null'],
        enum: ['long', null, 'ok'],
        maxLength: 2,
      },
    },
  };
  expect(
    validInput(
      JsonSchema.parse(schema),
      generateValue('bounded-literal', JsonSchema.parse(schema)),
    ),
  ).toBe(true);
});
