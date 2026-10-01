import { readFile, writeFile } from 'node:fs/promises';
import { GoogleGenAI, type GenerateContentParameters } from '@google/genai';
import { createGeminiProvider } from '../src/engine/planning/gemini';
import { boundedContext } from '../src/engine/planning/context';
import {
  requestProposal,
  PlanningError,
} from '../src/engine/planning/provider';
import { loadLocalEnvironment, readConfig } from '../src/server/config';
import { validateJourney } from '../src/engine/validation/journey';
import { unpackProposal } from '../src/engine/mapping/state';
import {
  ProviderRequestError,
  ProviderOutputError,
} from '../src/engine/planning/provider';

// Provider-only: this script has no fixture, dispatcher or target transport.
loadLocalEnvironment();
const config = readConfig(process.env);
const historical = JSON.parse(
  await readFile('tests/acceptance/vertical-slice-failed.json', 'utf8'),
) as {
  evidence: { kind: string; evaluation: { context?: unknown } }[];
  runs: {
    immutable_snapshot: {
      apiSnapshot: import('../src/engine/contracts').ApiModel;
      scope: import('../src/engine/contracts').FrozenScope;
    };
  }[];
};
const context = boundedContext(
  historical.evidence.find((e) => e.kind === 'PLANNING INTENT')?.evaluation
    .context,
);
let request: GenerateContentParameters | undefined;
await createGeminiProvider(
  { model: config.geminiModel, apiKey: config.geminiApiKey },
  {
    models: {
      async generateContentStream(input) {
        request = input;
        throw new Error('CAPTURE ONLY');
      },
    },
  },
)
  .propose(context, new AbortController().signal)
  .catch(() => undefined);
if (!request) throw new Error('REQUEST NOT CAPTURED');
const original = request;
const schema: unknown = JSON.parse(
  await readFile(
    'tests/acceptance/gemini-request-schema-rejected.json',
    'utf8',
  ),
);
await writeFile(
  '/private/tmp/ghostqa-gemini-fixed-schema.json',
  JSON.stringify(original.config?.responseJsonSchema, null, 2),
);
const sdk = new GoogleGenAI({
  apiKey: config.geminiApiKey,
  httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } },
});
const records: unknown[] = [];
for (const mode of process.argv.slice(2)) {
  if (mode === 'GENERATE' || mode === 'LIVE') {
    const snapshot = historical.runs[0]!.immutable_snapshot;
    try {
      const provider = createGeminiProvider({
        model: config.geminiModel,
        apiKey: config.geminiApiKey,
      });
      const generated = await provider.propose(
        context,
        AbortSignal.timeout(30000),
      );
      const providerRecord = {
        mode,
        model: generated.model,
        providerSuccess: true,
        stage: 'CONTRACT_VALIDATION',
        usage: generated.usage,
      };
      console.log(JSON.stringify(providerRecord));
      records.push(providerRecord);
      if (mode === 'GENERATE') {
        await writeFile(
          '/private/tmp/ghostqa-gemini-diagnostic.json',
          JSON.stringify(records, null, 2),
        );
        continue;
      }
      try {
        validateJourney(
          unpackProposal(generated.proposal).journey,
          snapshot.apiSnapshot,
          snapshot.scope,
          'EXPLORATION',
        );
      } catch (error) {
        const reasons = [
          'INVALID DEPENDENCY',
          'INVALID EXTRACTION',
          'DUPLICATE VARIABLE',
          'UNKNOWN OPERATION',
          'UNKNOWN PARAMETER',
          'MISSING PARAMETER',
          'MISSING BODY',
          'UNDECLARED BODY',
          'INVALID BODY',
          'INVALID BODY POINTER',
        ];
        console.log(
          JSON.stringify({
            mode,
            stage: 'PLAN VALIDATION',
            reason:
              error instanceof Error && reasons.includes(error.message)
                ? error.message
                : 'MODEL PLAN ERROR',
          }),
        );
      }
      const reply = await requestProposal({
        provider: {
          identity: provider.identity,
          propose: async () => generated,
        },
        context,
        api: snapshot.apiSnapshot,
        scope: snapshot.scope,
        model: config.geminiModel,
        signal: AbortSignal.timeout(30000),
        timeoutMs: 30000,
        remainingMilliseconds: 30000,
      });
      const record = {
        mode,
        model: reply.model,
        success: true,
        stage: 'CONTRACT_VALIDATION',
        usage: reply.usage,
      };
      console.log(JSON.stringify(record));
      records.push(record);
    } catch (error) {
      const record = {
        mode,
        success: false,
        reason: error instanceof PlanningError ? error.message : 'MODEL ERROR',
        telemetry: error instanceof PlanningError ? error.telemetry : undefined,
        diagnostic:
          error instanceof ProviderRequestError ||
          error instanceof ProviderOutputError
            ? error.diagnostic
            : undefined,
      };
      console.log(JSON.stringify(record));
      records.push(record);
      process.exitCode = 1;
    }
    await writeFile(
      '/private/tmp/ghostqa-gemini-diagnostic.json',
      JSON.stringify(records, null, 2),
    );
    continue;
  }
  const options = {
    ...original.config,
    responseJsonSchema: schema,
    abortSignal: AbortSignal.timeout(30000),
  };
  if (mode === 'A') {
    delete options.responseMimeType;
    delete options.responseJsonSchema;
  } else if (mode === 'B') delete options.responseJsonSchema;
  else if (mode === 'FIXED')
    options.responseJsonSchema = original.config?.responseJsonSchema;
  else if (mode === 'free-json')
    options.responseJsonSchema = {
      anyOf: [
        {
          type: ['string', 'number', 'boolean', 'null', 'object'],
          additionalProperties: true,
        },
        {
          type: 'array',
          items: {
            type: ['string', 'number', 'boolean', 'null', 'object'],
            additionalProperties: true,
          },
        },
      ],
    };
  else if (mode === 'open-object')
    options.responseJsonSchema = { type: 'object', additionalProperties: true };
  else if (mode === 'fixed-no-limits') {
    const strip = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(strip);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !['minItems', 'maxItems'].includes(key))
          .map(([key, value]) => [key, strip(value)]),
      );
    };
    options.responseJsonSchema = strip(original.config?.responseJsonSchema);
  } else if (mode.startsWith('fixed-json-')) {
    const simplify = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(simplify);
      if (!value || typeof value !== 'object') return value;
      const node = value as Record<string, unknown>;
      if (
        Array.isArray(node.anyOf) &&
        Array.isArray((node.anyOf[0] as Record<string, unknown>)?.type)
      ) {
        if (mode === 'fixed-json-any-no-limits') return {};
        if (mode === 'fixed-json-open' || mode === 'fixed-json-open-no-limits')
          return { type: 'object', additionalProperties: true };
        if (mode.startsWith('fixed-json-scalar'))
          return {
            type: ['string', 'number', 'boolean', 'null', 'object'],
            additionalProperties: true,
          };
        return {
          type: ['string', 'number', 'boolean', 'null', 'object', 'array'],
          additionalProperties: true,
          items: {
            type: ['string', 'number', 'boolean', 'null', 'object'],
            additionalProperties: true,
          },
        };
      }
      return Object.fromEntries(
        Object.entries(node)
          .filter(
            ([key]) =>
              !mode.endsWith('-no-limits') ||
              !['minItems', 'maxItems'].includes(key),
          )
          .map(([key, value]) => [key, simplify(value)]),
      );
    };
    options.responseJsonSchema = simplify(original.config?.responseJsonSchema);
  } else if (mode === 'D')
    options.responseJsonSchema = {
      type: 'object',
      properties: { acknowledgement: { type: 'string' } },
      required: ['acknowledgement'],
    };
  else if (mode === 'journey' || mode === 'proposal')
    options.responseJsonSchema = (schema as { anyOf: unknown[] }).anyOf[
      mode === 'journey' ? 0 : 1
    ];
  else if (mode === 'small-root-union')
    options.responseJsonSchema = {
      anyOf: [
        {
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
        },
        {
          type: 'object',
          properties: { b: { type: 'string' } },
          required: ['b'],
        },
      ],
    };
  else if (mode === 'typed-root-union')
    options.responseJsonSchema = {
      type: 'object',
      ...(schema as Record<string, unknown>),
    };
  else if (mode === 'oneOf-to-anyOf') {
    const convert = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(convert);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(
        Object.entries(value).map(([key, value]) => [
          key === 'oneOf' ? 'anyOf' : key,
          convert(value),
        ]),
      );
    };
    options.responseJsonSchema = convert(schema);
  } else if (mode !== 'C') {
    // Remove a single keyword recursively, keeping property names intact.
    const project = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(project);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== mode)
          .map(([key, value]) => [key, project(value)]),
      );
    };
    options.responseJsonSchema = project(schema);
  }
  let record: Record<string, unknown>;
  try {
    const stream = await sdk.models.generateContentStream({
      ...original,
      config: options,
    });
    let bytes = 0;
    for await (const chunk of stream)
      bytes += Buffer.byteLength(chunk.text ?? '');
    record = {
      mode,
      model: config.geminiModel,
      stage: 'REQUEST',
      success: true,
      responseBytes: bytes,
    };
  } catch (error) {
    const e = error as { status?: unknown; message?: unknown };
    // Never copy exception messages, bodies, URLs or headers into diagnostics.
    const known = [
      'INVALID_ARGUMENT',
      'RESOURCE_EXHAUSTED',
      'NOT_FOUND',
      'UNAUTHENTICATED',
      'PERMISSION_DENIED',
    ];
    record = {
      mode,
      model: config.geminiModel,
      stage: 'REQUEST',
      success: false,
      httpStatus: typeof e.status === 'number' ? e.status : undefined,
      apiStatus:
        known.find(
          (status) =>
            typeof e.message === 'string' && e.message.includes(status),
        ) ?? 'UNKNOWN',
    };
  }
  records.push(record);
  console.log(JSON.stringify(record));
  await writeFile(
    '/private/tmp/ghostqa-gemini-diagnostic.json',
    JSON.stringify(records, null, 2),
  );
}
