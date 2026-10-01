// Evaluator configuration only. This registry is never imported by the engine/planner.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { startOrderFixture } from './api/order-lifecycle';
import { startInventoryFixture } from './api/inventory';
import { startWorkflowFixture } from './api/workflow';
import { orderConfiguration } from '../scripts/t035-configuration';
import { parseOpenApi } from '../src/engine/openapi/parse';
import { approveScope } from '../src/engine/policy/scope';
import { BudgetManager, defaultLimits } from '../src/engine/budget/manager';
import { predicateHash } from '../src/engine/detection/predicate';
import {
  RunSchema,
  PredicateSchema,
  OperationPolicySchema,
  JourneySchema,
  type Run,
} from '../src/engine/contracts';
export const RequiredSuiteSchema = z
  .strictObject({
    formatVersion: z.literal(1),
    fixtures: z
      .array(
        z.strictObject({
          id: z.enum(['order-lifecycle', 'inventory', 'workflow']),
          module: z.string(),
          startExport: z.string(),
          openapi: z.string(),
          variants: z.strictObject({
            inconsistent: z.literal(false),
            repaired: z.literal(true),
          }),
          baseline: z.record(z.string(), z.literal(0)),
          operationPolicy: OperationPolicySchema,
          invariant: PredicateSchema.pick({
            sourceRef: true,
            applicability: true,
            assertions: true,
          }),
          evaluator: z.strictObject({
            priorStep: z.string(),
            laterStep: z.literal('later'),
            actions: z.array(z.string()).length(3),
            inconsistentState: z.string(),
            repairedState: z.string(),
          }),
        }),
      )
      .length(3),
  })
  .superRefine((suite, ctx) => {
    const ids = ['order-lifecycle', 'inventory', 'workflow'];
    const exports = [
      'startOrderFixture',
      'startInventoryFixture',
      'startWorkflowFixture',
    ];
    suite.fixtures.forEach((entry, index) => {
      if (
        entry.id !== ids[index] ||
        entry.module !== `fixtures/api/${entry.id}.ts` ||
        entry.openapi !== `fixtures/openapi/${entry.id}.json` ||
        entry.startExport !== exports[index]
      )
        ctx.addIssue({ code: 'custom', message: 'INVALID REQUIRED SUITE' });
    });
  });
export type RequiredSuite = z.infer<typeof RequiredSuiteSchema>;
export type RequiredFixture = RequiredSuite['fixtures'][number];
export async function loadRequiredSuite(): Promise<RequiredSuite> {
  return RequiredSuiteSchema.parse(
    JSON.parse(
      await readFile(
        new URL('./private/required-suite.json', import.meta.url),
        'utf8',
      ),
    ),
  );
}
export function startRequiredFixture(
  entry: RequiredFixture,
  repaired: boolean,
) {
  switch (entry.id) {
    case 'order-lifecycle':
      return startOrderFixture(repaired);
    case 'inventory':
      return startInventoryFixture(repaired);
    case 'workflow':
      return startWorkflowFixture(repaired);
  }
}
export async function requiredConfiguration(
  entry: RequiredFixture,
  document: unknown,
  url: string,
  identity: { provider: string; model: string },
): Promise<Run> {
  if (entry.id === 'order-lifecycle') {
    const { run } = await orderConfiguration(document, url, identity.model);
    run.modelConfiguration = { ...identity };
    run.budget = new BudgetManager(defaultLimits).snapshot();
    return RunSchema.parse(run);
  }
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
  return RunSchema.parse({
    id: randomUUID(),
    projectId: randomUUID(),
    apiSnapshot: await parseOpenApi(JSON.stringify(document)),
    scope: approveScope(
      url + '/api',
      [{ ip: '127.0.0.1', family: 4 }],
      entry.operationPolicy,
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
            'reset acknowledgement',
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
            'empty baseline',
            [],
            Object.entries(entry.baseline).map(([key, value]) => ({
              op: 'equals',
              left: { kind: 'json', stepId: 'baseline', pointer: '/' + key },
              right: { kind: 'literal', value },
            })),
          ),
        },
      ],
    },
    predicates: [
      predicate(
        entry.invariant.sourceRef,
        entry.invariant.applicability,
        entry.invariant.assertions,
      ),
    ],
    budget: new BudgetManager(defaultLimits).snapshot(),
    status: 'ACCEPTED',
    credentialBindings: [],
    modelConfiguration: { ...identity },
  });
}
// Explicitly supplied evaluator case. Never called by autonomous discovery configuration.
export function evaluatorJourney(
  entry: RequiredFixture,
  run: Run,
  redundant = false,
) {
  const p = run.predicates[0]!,
    create = entry.evaluator.actions[0]!,
    steps = entry.evaluator.actions.map((operationId, index) => {
      const id =
        index === 0
          ? 'create'
          : index === 1
            ? entry.evaluator.priorStep
            : 'later';
      const parameter = /\{([^}]+)\}/.exec(operationId)?.[1];
      return {
        id,
        operationId,
        parameters: parameter
          ? [
              {
                location: 'path',
                name: parameter,
                value: { kind: 'variable', name: 'id' },
              },
            ]
          : [],
        bodyBindings: [],
        extracts:
          index === 0
            ? [
                {
                  name: 'id',
                  expectedType: 'string',
                  source: { kind: 'json', stepId: 'create', pointer: '/id' },
                  sensitive: false,
                },
              ]
            : [],
        expectedStatuses: index === 0 ? [201] : [200, 409],
      };
    });
  if (redundant)
    steps.splice(1, 0, {
      id: 'redundant',
      operationId: create,
      parameters: [],
      bodyBindings: [],
      extracts: [],
      expectedStatuses: [201],
    });
  return JourneySchema.parse({
    id: randomUUID(),
    predicateRef: { id: p.id, version: p.version, hash: p.canonicalHash },
    rationale: 'Evaluator-supplied acceptance; not autonomous discovery',
    variables: [],
    dependencies: [
      {
        producer: 'create',
        consumer: entry.evaluator.priorStep,
        variable: 'id',
      },
      { producer: 'create', consumer: 'later', variable: 'id' },
    ],
    steps,
  });
}
