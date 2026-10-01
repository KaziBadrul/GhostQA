import { expect, test } from 'vitest';
import {
  buildPlanningContext,
  boundedContext,
} from '../../src/engine/planning/context';
import {
  requestProposal,
  PlanningError,
} from '../../src/engine/planning/provider';
import { SecretVault } from '../../src/engine/secrets/vault';
import { planningFixture, reply } from '../helpers/planning';

test('schema example secret is also removed from unexpected observation echoes', () => {
  const f = planningFixture();
  f.run.apiSnapshot.operations[2]!.requestBody = {
    type: 'object',
    properties: { token: { type: 'string', example: 'schema-private-value' } },
  };
  const observations = [
    {
      id: f.run.id,
      runId: f.run.id,
      trialId: f.run.projectId,
      stepId: 'inspect',
      result: {
        stepId: 'inspect',
        sanitizedRequest: {},
        sanitizedResponse: { echo: 'schema-private-value' },
        truncated: false,
        startedAt: new Date().toISOString(),
        elapsedMs: 1,
        outcome: 'RESPONSE' as const,
      },
      stateMappings: [],
    },
  ];
  const context = buildPlanningContext(
    {
      run: f.run,
      mappings: [],
      observations,
      symbolicInputs: {},
      consideredHypothesisHashes: [],
    },
    new SecretVault(),
  );
  expect(JSON.stringify(context)).not.toContain('schema-private-value');
  expect(JSON.stringify(context)).toContain('[SECRET_');
  expect(context.api.operations[0]!.requestBody).toHaveProperty(
    'properties.token',
  );
});

test('a provider cannot mutate scope during its call to grant itself a reset operation', async () => {
  const f = planningFixture();
  const proposal = structuredClone(f.journey);
  proposal.steps[0]!.operationId = 'POST /api/reset';
  const provider = {
    propose: async () => {
      const permission = f.run.scope.operationPolicy.find(
        (p) => p.operationId === 'POST /api/reset',
      )!;
      permission.category = 'EXPLORATION';
      permission.phases = ['EXPLORATION'];
      return reply(proposal);
    },
  };
  await expect(
    requestProposal({
      provider,
      context: boundedContext(f.context),
      api: f.run.apiSnapshot,
      scope: f.run.scope,
      model: 'configured-model',
      signal: new AbortController().signal,
      timeoutMs: 30000,
      remainingMilliseconds: 600000,
    }),
  ).rejects.toThrow(/^MODEL PLAN ERROR$/);
});

test('invalid proposal preserves reported safe usage and identity without retaining raw output', async () => {
  const f = planningFixture();
  try {
    await requestProposal({
      provider: {
        propose: async () => reply({ prose: 'private-raw-model-detail' }),
      },
      context: boundedContext(f.context),
      api: f.run.apiSnapshot,
      scope: f.run.scope,
      model: 'configured-model',
      signal: new AbortController().signal,
      timeoutMs: 30000,
      remainingMilliseconds: 600000,
    });
    expect.fail('invalid output must fail');
  } catch (error) {
    expect(error).toBeInstanceOf(PlanningError);
    expect((error as PlanningError).telemetry).toMatchObject({
      provider: 'mock-provider',
      model: 'configured-model',
      attempted: true,
      outcome: 'MODEL PLAN ERROR',
      usage: { inputTokens: 12, outputTokens: 8, estimated: false },
    });
    expect(JSON.stringify(error)).not.toContain('private-raw-model-detail');
  }
});
