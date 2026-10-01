import { afterEach, expect, test, vi } from 'vitest';
import { PlanningContextSchema } from '../../src/engine/planning/context';
import {
  PlanningError,
  ProviderRequestError,
  ProviderOutputError,
  requestProposal,
  type RequestInput,
} from '../../src/engine/planning/provider';
import { planningFixture } from '../helpers/planning';
afterEach(() => vi.useRealTimers());
function input(): RequestInput {
  const f = planningFixture();
  return {
    provider: {
      identity: { provider: 'test', model: 'configured-model' },
      propose: vi.fn(async () => new Promise<never>(() => {})),
    },
    context: PlanningContextSchema.parse(f.context),
    api: f.run.apiSnapshot,
    scope: f.run.scope,
    model: 'configured-model',
    signal: new AbortController().signal,
    timeoutMs: 20,
    remainingMilliseconds: 200,
  };
}
async function failure(i: RequestInput) {
  try {
    await requestProposal(i);
    throw Error('Failure required');
  } catch (e) {
    if (!(e instanceof PlanningError)) throw e;
    return e;
  }
}
test('deadline reports attempted call and TIMEOUT without changing MODEL ERROR or retrying', async () => {
  vi.useFakeTimers();
  const i = input();
  const pending = failure(i);
  await vi.advanceTimersByTimeAsync(20);
  const e = await pending;
  expect(e.message).toBe('MODEL ERROR');
  expect(e.telemetry).toMatchObject({
    attempted: true,
    failureKind: 'TIMEOUT',
    timeoutMs: 20,
  });
  expect(e.telemetry.elapsedMs).toBeGreaterThanOrEqual(0);
  expect(i.provider.propose).toHaveBeenCalledTimes(1);
  expect(vi.mocked(i.provider.propose).mock.calls[0]![1].aborted).toBe(true);
});
test('model mismatch is distinguished from an attempted provider request', async () => {
  const i = input();
  i.model = 'different-model';
  const e = await failure(i);
  expect(e.message).toBe('MODEL ERROR');
  expect(e.telemetry).toMatchObject({
    attempted: false,
    failureKind: 'MODEL_CONFIGURATION',
  });
  expect(i.provider.propose).not.toHaveBeenCalled();
});
test('SDK/API error retains sanitized diagnostic status separately from deadline', async () => {
  const i = input();
  i.provider.propose = vi.fn(async () => {
    throw new ProviderRequestError({
      stage: 'REQUEST',
      model: i.model,
      httpStatus: 400,
      apiStatus: 'INVALID_ARGUMENT',
    });
  });
  expect((await failure(i)).telemetry).toMatchObject({
    attempted: true,
    failureKind: 'PROVIDER_REQUEST',
    diagnostic: { httpStatus: 400, apiStatus: 'INVALID_ARGUMENT' },
  });
});
test('output rejection remains MODEL PLAN ERROR without changing strict validation', async () => {
  const i = input();
  i.provider.propose = vi.fn(async () => {
    throw new ProviderOutputError({ stage: 'RESPONSE_PARSE', model: i.model });
  });
  const e = await failure(i);
  expect(e.message).toBe('MODEL PLAN ERROR');
  expect(e.telemetry).toMatchObject({
    attempted: true,
    failureKind: 'PROVIDER_OUTPUT',
    diagnostic: { stage: 'RESPONSE_PARSE' },
  });
});
test('unknown provider exceptions retain classification but never raw protected details', async () => {
  const i = input();
  i.provider.propose = vi.fn(async () => {
    throw Object.assign(new Error('protected-value'), {
      headers: { authorization: 'protected-value' },
    });
  });
  const e = await failure(i);
  expect(e.telemetry).toMatchObject({
    attempted: true,
    failureKind: 'PROVIDER_EXCEPTION',
  });
  expect(JSON.stringify(e.telemetry)).not.toContain('protected-value');
});

function returned(proposal: unknown): RequestInput {
  const i = input();
  i.timeoutMs = 30000;
  i.remainingMilliseconds = 600000;
  i.provider.propose = vi.fn(async () => ({
    proposal,
    provider: 'test',
    model: i.model,
    usage: { inputTokens: 1, outputTokens: 1, estimated: false },
  }));
  return i;
}
test('downstream unknown operation retains fixed validation code, not the rejected operation', async () => {
  const f = planningFixture();
  f.journey.steps[0]!.operationId = 'protected-operation-value';
  const e = await failure(returned(f.journey));
  expect(e.message).toBe('MODEL PLAN ERROR');
  expect(e.telemetry.diagnostic).toMatchObject({
    stage: 'CONTRACT_VALIDATION',
    validationRule: 'UNKNOWN OPERATION',
  });
  expect(JSON.stringify(e.telemetry)).not.toContain(
    'protected-operation-value',
  );
});
test('exact predicate-reference rejection is diagnosable without exposing its value', async () => {
  const f = planningFixture();
  const i = returned(f.journey);
  i.context.approvedPredicateRefs = [];
  const e = await failure(i);
  expect(e.telemetry.diagnostic).toMatchObject({
    validationRule: 'PREDICATE REFERENCE',
  });
});
test('Zod contract issues retain only allowlisted codes and structural paths', async () => {
  const f = planningFixture();
  const proposal = {
    ...f.journey,
    'protected-secret-key': 'protected-secret-value',
  };
  const e = await failure(returned(proposal));
  expect(e.telemetry.diagnostic).toMatchObject({
    validationRule: 'PROPOSAL SCHEMA',
    contractIssues: [{ code: 'unrecognized_keys', path: [] }],
  });
  expect(JSON.stringify(e.telemetry)).not.toMatch(/protected-secret/);
});
test('missing predicate evidence role gets its own validation rule without changing rejection', async () => {
  const f = planningFixture();
  const i = returned(f.journey);
  i.context.approvedPredicateRefs = [f.journey.predicateRef];
  i.context.predicateDefinitions = [
    {
      ...f.run.predicates[0]!,
      id: f.journey.predicateRef.id,
      version: f.journey.predicateRef.version,
      canonicalHash: f.journey.predicateRef.hash,
      assertions: [
        {
          op: 'equals',
          left: {
            kind: 'json',
            stepId: 'protected-missing-role',
            pointer: '/state',
          },
          right: { kind: 'literal', value: 'protected-value' },
        },
      ],
    },
  ];
  const e = await failure(i);
  expect(e.telemetry.diagnostic).toMatchObject({
    validationRule: 'PREDICATE STEP',
  });
  expect(JSON.stringify(e.telemetry)).not.toMatch(
    /protected-missing-role|protected-value/,
  );
});
test('output-size validation has a bounded category and makes only one call', async () => {
  const i = returned({ data: 'x'.repeat(65537) });
  const e = await failure(i);
  expect(e.telemetry.diagnostic).toMatchObject({
    validationRule: 'OUTPUT SIZE',
  });
  expect(i.provider.propose).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(e.telemetry).length).toBeLessThan(1000);
});
