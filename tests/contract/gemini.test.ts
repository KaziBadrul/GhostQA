import { createModelPacer } from '../../src/engine/planning/pacing';
import { GenerateContentResponse, FinishReason } from '@google/genai';
import { afterEach, expect, test, vi } from 'vitest';
import {
  createGeminiProvider,
  geminiDiagnostic,
  type GeminiClient,
} from '../../src/engine/planning/gemini';
import {
  journeyResponseSchema,
  projectGeminiSchema,
} from '../../src/engine/planning/gemini-schema';
import {
  requestProposal,
  PlanningError,
} from '../../src/engine/planning/provider';
import { boundedContext } from '../../src/engine/planning/context';
import { planningFixture } from '../helpers/planning';

afterEach(() => vi.unstubAllGlobals());
function harness(text: string, usage = true) {
  const fixture = planningFixture();
  const chunk = new GenerateContentResponse();
  chunk.candidates = [
    { content: { parts: [{ text }] }, finishReason: FinishReason.STOP },
  ];
  if (usage)
    chunk.usageMetadata = { promptTokenCount: 20, candidatesTokenCount: 30 };
  async function* chunks() {
    yield chunk;
  }
  const generateContentStream = vi.fn<
    GeminiClient['models']['generateContentStream']
  >(async () => chunks());
  // SDK returns a promise of its stream, rather than the stream directly.
  const client: GeminiClient = {
    models: {
      generateContentStream: vi.fn(async (input) =>
        generateContentStream(input),
      ),
    },
  };
  const provider = createGeminiProvider(
    { model: 'explicit-model', apiKey: 'provider-private-key' },
    client,
    (() => {
      let now = 0;
      return createModelPacer(12, {
        now: () => now,
        sleep: async (ms) => {
          now += ms;
        },
      });
    })(),
  );
  const input = {
    provider,
    context: boundedContext(fixture.context),
    api: fixture.run.apiSnapshot,
    scope: fixture.run.scope,
    model: 'explicit-model',
    signal: new AbortController().signal,
    timeoutMs: 30000,
    remainingMilliseconds: 600000,
  };
  return { ...fixture, client, input };
}

test('Gemini SDK request is explicit JSON-only, one attempt, no tools, no target scope', async () => {
  const f = planningFixture();
  const h = harness(JSON.stringify(f.journey));
  h.input.context.approvedPredicateRefs = [f.journey.predicateRef];
  const result = await requestProposal(h.input);
  expect(result).toMatchObject({
    provider: 'gemini',
    model: 'explicit-model',
    usage: { inputTokens: 20, outputTokens: 30, estimated: false },
  });
  const call = vi.mocked(h.client.models.generateContentStream).mock
    .calls[0]![0];
  expect(call.model).toBe('explicit-model');
  expect(call.config).toMatchObject({
    candidateCount: 1,
    responseMimeType: 'application/json',
    httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } },
  });
  expect(call.config?.abortSignal).toBeInstanceOf(AbortSignal);
  expect(call.config?.systemInstruction).toContain('untrusted target data');
  expect(call.config?.responseJsonSchema).toBeDefined();
  expect(call.config).not.toHaveProperty('responseSchema');
  expect(call.config).not.toHaveProperty('tools');
  expect(JSON.stringify(call)).not.toContain('provider-private-key');
  expect(JSON.stringify(call.contents)).not.toContain('operationPolicy');
  expect(h.client.models.generateContentStream).toHaveBeenCalledTimes(1);
});

test('generation schema is one proposal envelope and only supported JSON Schema nodes reach SDK', () => {
  const schema = journeyResponseSchema();
  expect(schema.type).toBe('object');
  expect(schema).not.toHaveProperty('anyOf');
  expect(schema.required).toEqual(['journey', 'mappings', 'hypotheses']);
  const mappings = (
    schema.properties as Record<
      string,
      {
        items: { required: string[]; properties: { kind: { enum: string[] } } };
      }
    >
  ).mappings!;
  expect(mappings.items.required).toContain('rationale');
  expect(mappings.items.properties.kind.enum).toEqual([
    'INFERRED_DEPENDENCY',
    'HYPOTHESIZED_STATE',
  ]);
  const allowed = new Set([
    'type',
    'properties',
    'required',
    'additionalProperties',
    'items',
    'anyOf',
    'oneOf',
    'enum',
    'minimum',
    'maximum',
    'minItems',
    'maxItems',
  ]);
  const inspect = (node: unknown): void => {
    expect(node).toBeTypeOf('object');
    const object = node as Record<string, unknown>;
    for (const key of Object.keys(object))
      expect(allowed.has(key), key).toBe(true);
    if (object.properties)
      for (const child of Object.values(object.properties)) inspect(child);
    if (object.items) inspect(object.items);
    for (const key of ['anyOf', 'oneOf'])
      if (Array.isArray(object[key])) object[key].forEach(inspect);
    if (object.required)
      for (const key of object.required as string[])
        expect(Object.hasOwn(object.properties as object, key)).toBe(true);
  };
  inspect(schema);
  expect(JSON.parse(JSON.stringify(schema))).toEqual(schema);
});

test('projection filters unsupported material without dropping property names or restricting JSON to fixture keys', () => {
  const projected = projectGeminiSchema({
    type: 'object',
    $defs: { private: { malformed: true } },
    pattern: 'secret',
    properties: {
      format: {
        type: 'string',
        format: 'uuid',
        pattern: '[a-z]',
        default: 'private',
      },
      payload: { $ref: '#/$defs/json', description: 'private', minimum: 4 },
    },
    required: ['format', 'payload'],
    additionalProperties: false,
    unsupported: undefined,
  });
  expect((projected.properties as Record<string, unknown>).format).toEqual({
    type: 'string',
  });
  const encoded = JSON.stringify(projected);
  for (const forbidden of [
    '$ref',
    '$defs',
    'private',
    'email',
    'password',
    'token',
    'pattern',
    'default',
    'unsupported',
  ])
    expect(encoded).not.toContain(forbidden);
  expect(
    projectGeminiSchema({
      type: 'object',
      properties: { x: { type: 'string' } },
      required: ['missing'],
    }),
  ).not.toHaveProperty('required');
  expect(() => projectGeminiSchema({ type: 'invalid' })).toThrow(
    'INVALID GENERATION SCHEMA',
  );
});

test.each([
  (j: ReturnType<typeof planningFixture>['journey']) => ({
    ...j,
    phase: 'RESET',
  }),
  (j: ReturnType<typeof planningFixture>['journey']) => ({
    ...j,
    id: 'model-invented-id',
  }),
  (j: ReturnType<typeof planningFixture>['journey']) => ({
    ...j,
    steps: [{ ...j.steps[0], unexpected: true }],
  }),
])(
  'adapter strictly validates parsed JSON before returning a proposal',
  async (change) => {
    const h = harness(JSON.stringify(change(planningFixture().journey)));
    try {
      await requestProposal(h.input);
      expect.fail('invalid output must reject');
    } catch (error) {
      expect(error).toBeInstanceOf(PlanningError);
      expect((error as PlanningError).telemetry).toMatchObject({
        outcome: 'MODEL PLAN ERROR',
        diagnostic: { stage: 'CONTRACT_VALIDATION', model: 'explicit-model' },
      });
    }
  },
);

test('parse failure diagnostics contain only stage and model', async () => {
  const h = harness('{ private-output');
  await expect(requestProposal(h.input)).rejects.toMatchObject({
    message: 'MODEL PLAN ERROR',
    telemetry: {
      diagnostic: { stage: 'RESPONSE_PARSE', model: 'explicit-model' },
    },
  });
});

test('request diagnostics preserve allowlisted status and never SDK exception contents', async () => {
  const h = harness('{}');
  const error = Object.assign(
    new Error(
      'INVALID_ARGUMENT provider-private-key postgresql://private Authorization: private',
    ),
    {
      status: 400,
      request: { headers: { authorization: 'private' } },
      response: { body: 'private' },
      cause: 'private',
    },
  );
  vi.mocked(h.client.models.generateContentStream).mockRejectedValueOnce(error);
  try {
    await requestProposal(h.input);
    expect.fail('SDK error must reject');
  } catch (error) {
    expect(error).toMatchObject({
      message: 'MODEL ERROR',
      telemetry: {
        diagnostic: {
          stage: 'REQUEST',
          model: 'explicit-model',
          httpStatus: 400,
          apiStatus: 'INVALID_ARGUMENT',
        },
      },
    });
    expect(JSON.stringify(error)).not.toContain('private');
    expect(JSON.stringify(error)).not.toContain('Authorization');
  }
  expect(
    geminiDiagnostic(
      { status: 'private', message: 'private', headers: 'private' },
      'explicit-model',
    ),
  ).toEqual({
    model: 'explicit-model',
    stage: 'REQUEST',
    apiStatus: 'UNKNOWN',
  });
});

test.each(['', 'refused', '{', '```json\n{}\n```', 'x'.repeat(65537)])(
  'refused/malformed/oversized Gemini stream fails MODEL PLAN ERROR',
  async (text) => {
    const h = harness(text);
    await expect(requestProposal(h.input)).rejects.toThrow(
      /^MODEL PLAN ERROR$/,
    );
    expect(h.client.models.generateContentStream).toHaveBeenCalledTimes(1);
  },
);

test('missing SDK token usage produces explicitly estimated counts', async () => {
  const f = planningFixture();
  const h = harness(JSON.stringify(f.journey), false);
  h.input.context.approvedPredicateRefs = [f.journey.predicateRef];
  const result = await requestProposal(h.input);
  expect(result.usage).toEqual({
    inputTokens: Math.ceil(Buffer.byteLength(JSON.stringify(h.context)) / 4),
    outputTokens: Math.ceil(Buffer.byteLength(JSON.stringify(f.journey)) / 4),
    estimated: true,
  });
});

test('official SDK receives mocked 429 once; safe failed telemetry has unknown output usage', async () => {
  const fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          error: { message: 'private-response-detail', code: 429 },
        }),
        { status: 429, headers: { 'content-type': 'application/json' } },
      ),
  );
  vi.stubGlobal('fetch', fetchMock);
  const f = planningFixture();
  const provider = createGeminiProvider({
    model: 'explicit-model',
    apiKey: 'provider-private-key',
  });
  try {
    await requestProposal({
      provider,
      context: boundedContext(f.context),
      api: f.run.apiSnapshot,
      scope: f.run.scope,
      model: 'explicit-model',
      signal: new AbortController().signal,
      timeoutMs: 1000,
      remainingMilliseconds: 1000,
    });
    expect.fail('provider 429 must reject');
  } catch (error) {
    expect(error).toBeInstanceOf(PlanningError);
    expect((error as PlanningError).telemetry).toMatchObject({
      provider: 'gemini',
      model: 'explicit-model',
      attempted: true,
      outcome: 'MODEL ERROR',
      usage: { estimated: true },
    });
    expect(
      (error as PlanningError).telemetry.usage.outputTokens,
    ).toBeUndefined();
    expect(JSON.stringify(error)).not.toContain('private-response-detail');
    expect(String(error)).not.toContain('provider-private-key');
  }
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('no implicit Gemini model, target URL or arbitrary model path', () => {
  for (const model of ['', 'https://attacker.invalid', '../models/anything'])
    expect(() => createGeminiProvider({ model, apiKey: 'key' })).toThrow();
});
