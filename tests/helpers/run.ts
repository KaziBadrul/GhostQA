import { predicateHash } from '../../src/engine/detection/predicate';
import { randomUUID } from 'node:crypto';
import { RunSchema, type Run } from '../../src/engine/contracts';
import { BudgetManager, defaultLimits } from '../../src/engine/budget/manager';
import { approveScope } from '../../src/engine/policy/scope';
export function makeRun(projectId: string, port = 4010): Run {
  const operations = [
    ['POST', '/api/reset'],
    ['GET', '/api/baseline'],
    ['GET', '/api/item'],
  ] as const;
  const baselinePredicate = {
    id: randomUUID(),
    version: 1,
    canonicalHash: 'a'.repeat(64),
    source: 'DEVELOPER' as const,
    sourceRef: 'owner',
    applicability: [],
    assertions: [
      {
        op: 'equals' as const,
        left: { kind: 'status' as const, stepId: 'read' },
        right: { kind: 'literal' as const, value: 200 },
      },
    ],
  };
  baselinePredicate.canonicalHash = predicateHash(baselinePredicate);
  const predicate = {
    id: randomUUID(),
    version: 1,
    canonicalHash: 'b'.repeat(64),
    source: 'DEVELOPER' as const,
    sourceRef: 'owner',
    applicability: [],
    assertions: [
      {
        op: 'equals' as const,
        left: { kind: 'status' as const, stepId: 'inspect' },
        right: { kind: 'literal' as const, value: 200 },
      },
    ],
  };
  predicate.canonicalHash = predicateHash(predicate);
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
    projectId,
    apiSnapshot: {
      snapshotId: randomUUID(),
      contentHash: 'b'.repeat(64),
      openapiVersion: '3.1.0',
      operations: operations.map(([method, path]) => ({
        id: `${method} ${path}`,
        method,
        pathTemplate: path,
        parameters: [],
        responses: {},
        eligible: true,
        exclusionReasons: [],
      })),
      importDiagnostics: [],
    },
    scope: approveScope(
      `http://localhost:${port}/api`,
      [{ ip: '127.0.0.1', family: 4 }],
      [
        {
          operationId: 'POST /api/reset',
          category: 'RESET',
          phases: ['RESET'],
        },
        {
          operationId: 'GET /api/baseline',
          category: 'BASELINE',
          phases: ['BASELINE'],
        },
        {
          operationId: 'GET /api/item',
          category: 'EXPLORATION',
          phases: ['EXPLORATION', 'REPLAY', 'MINIMIZATION', 'ARTIFACT'],
        },
      ],
      true,
      randomUUID(),
    ),
    reset: {
      id: randomUUID(),
      version: 1,
      resetSteps: [step('reset', 'POST /api/reset')],
      resetAssertions: [],
      checkSteps: [step('read', 'GET /api/baseline')],
      baselineAssertions: [{ id: randomUUID(), predicate: baselinePredicate }],
    },
    predicates: [predicate],
    budget: new BudgetManager(defaultLimits).snapshot(),
    status: 'ACCEPTED',
    modelConfiguration: { model: 'configured-model' },
  });
}
