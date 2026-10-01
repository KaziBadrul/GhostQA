import { randomUUID } from 'node:crypto';
import { parseOpenApi } from '../src/engine/openapi/parse';
import { approveScope } from '../src/engine/policy/scope';
import { predicateHash } from '../src/engine/detection/predicate';
import {
  RunSchema,
  PredicateSchema,
  OperationPolicySchema,
  type FrozenScope,
} from '../src/engine/contracts';
import { defaultLimits } from '../src/engine/budget/manager';

export function orderOperationPolicy(): FrozenScope['operationPolicy'] {
  return OperationPolicySchema.parse([
    {
      operationId: 'POST /api/control/reset',
      category: 'RESET',
      phases: ['RESET'],
    },
    {
      operationId: 'GET /api/control/baseline',
      category: 'BASELINE',
      phases: ['BASELINE'],
    },
    ...[
      'POST /api/orders',
      'GET /api/orders/{orderId}',
      'POST /api/orders/{orderId}/cancel',
      'POST /api/orders/{orderId}/fulfill',
    ].map((operationId) => ({
      operationId,
      category: 'EXPLORATION' as const,
      phases: ['EXPLORATION', 'REPLAY', 'MINIMIZATION', 'ARTIFACT'] as const,
    })),
  ]);
}
export async function orderConfiguration(
  publicDocument: unknown,
  url: string,
  model: string,
) {
  const predicate = (
    sourceRef: string,
    applicability: unknown[],
    assertions: unknown[],
  ) =>
    PredicateSchema.parse({
      id: randomUUID(),
      version: 1,
      source: 'DEVELOPER',
      sourceRef,
      applicability,
      assertions,
      canonicalHash: predicateHash({ applicability, assertions }),
    });
  const step = (id: string, operationId: string) => ({
    id,
    operationId,
    parameters: [],
    bodyBindings: [],
    extracts: [],
    expectedStatuses: [200],
  });
  const run = RunSchema.parse({
    id: randomUUID(),
    projectId: randomUUID(),
    apiSnapshot: await parseOpenApi(JSON.stringify(publicDocument)),
    scope: approveScope(
      url + '/api',
      [{ ip: '127.0.0.1', family: 4 }],
      orderOperationPolicy(),
      true,
      randomUUID(),
    ),
    reset: {
      id: randomUUID(),
      version: 1,
      resetSteps: [step('reset', 'POST /api/control/reset')],
      resetAssertions: [
        {
          id: randomUUID(),
          predicate: predicate(
            'reset-acknowledgement',
            [],
            [
              {
                op: 'equals',
                left: { kind: 'json', stepId: 'reset', pointer: '/reset' },
                right: { kind: 'literal', value: true },
              },
            ],
          ),
        },
      ],
      checkSteps: [step('baseline', 'GET /api/control/baseline')],
      baselineAssertions: [
        {
          id: randomUUID(),
          predicate: predicate(
            'empty-order-baseline',
            [],
            [
              {
                op: 'equals',
                left: { kind: 'json', stepId: 'baseline', pointer: '/orders' },
                right: { kind: 'literal', value: 0 },
              },
            ],
          ),
        },
      ],
    },
    predicates: [
      predicate(
        'an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial',
        [
          {
            op: 'equals',
            left: { kind: 'json', stepId: 'cancelled', pointer: '/state' },
            right: { kind: 'literal', value: 'CANCELLED' },
          },
          {
            op: 'equals',
            left: { kind: 'json', stepId: 'cancelled', pointer: '/id' },
            right: { kind: 'json', stepId: 'later', pointer: '/id' },
          },
          {
            op: 'before',
            left: { kind: 'step-index', stepId: 'cancelled' },
            right: { kind: 'step-index', stepId: 'later' },
          },
        ],
        [
          {
            op: 'not-equals',
            left: { kind: 'json', stepId: 'later', pointer: '/state' },
            right: { kind: 'literal', value: 'FULFILLED' },
          },
        ],
      ),
    ],
    budget: {
      limits: { ...defaultLimits, journeys: 1 },
      usedRequests: 0,
      usedExplorationJourneys: 0,
      modelCalls: 0,
      stagnantRounds: 0,
      requestsByPhase: {
        RESET: 0,
        BASELINE: 0,
        EXPLORATION: 0,
        REPLAY: 0,
        MINIMIZATION: 0,
        ARTIFACT: 0,
      },
      acceptedAt: new Date().toISOString(),
      deadlineAt: new Date(
        Date.now() + defaultLimits.milliseconds,
      ).toISOString(),
    },
    status: 'ACCEPTED',
    credentialBindings: [],
    modelConfiguration: { provider: 'gemini', model },
  });
  return { run, inputs: {} };
}
