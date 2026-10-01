import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import {
  JourneySchema,
  ResetConfigurationSchema,
  OperationPolicySchema,
  FindingSchema,
  StateMappingSchema,
  PredicateSchema,
} from '../../src/engine/contracts/index';
const predicate = {
  id: randomUUID(),
  version: 1,
  canonicalHash: 'a'.repeat(64),
  source: 'DEVELOPER',
  sourceRef: 'owner',
  applicability: [],
  assertions: [
    {
      op: 'equals',
      left: { kind: 'status', stepId: 'read' },
      right: { kind: 'literal', value: 200 },
    },
  ],
};
const step = {
  id: 'read',
  operationId: 'GET /api/item',
  parameters: [],
  bodyBindings: [],
  extracts: [],
  expectedStatuses: [200],
};
const journey = {
  id: randomUUID(),
  steps: [step],
  variables: [],
  predicateRef: { id: predicate.id, version: 1, hash: predicate.canonicalHash },
  rationale: 'Inspect state',
  dependencies: [],
};
test('accepts the declarative predicate/journey contract', () => {
  expect(JourneySchema.parse(journey).steps).toHaveLength(1);
  expect(PredicateSchema.parse(predicate)).toEqual(predicate);
});
test('rejects submitted phase and unknown fields', () => {
  expect(() => JourneySchema.parse({ ...journey, phase: 'RESET' })).toThrow();
});
test('rejects overlong and duplicate named steps', () => {
  expect(() =>
    JourneySchema.parse({ ...journey, steps: Array(11).fill(step) }),
  ).toThrow();
  expect(() =>
    JourneySchema.parse({ ...journey, steps: [step, step] }),
  ).toThrow();
});
test('baseline assertions cannot be empty', () => {
  expect(() =>
    ResetConfigurationSchema.parse({
      id: randomUUID(),
      version: 1,
      resetSteps: [step],
      resetAssertions: [],
      checkSteps: [step],
      baselineAssertions: [],
    }),
  ).toThrow();
});
test('reset operations cannot authorize exploration', () => {
  expect(() =>
    OperationPolicySchema.parse([
      {
        operationId: 'POST /reset',
        category: 'RESET',
        phases: ['RESET', 'EXPLORATION'],
      },
    ]),
  ).toThrow();
});
test('exclusions cannot authorize any phase', () => {
  expect(() =>
    OperationPolicySchema.parse([
      { operationId: 'GET /secret', category: 'EXCLUDED', phases: ['REPLAY'] },
    ]),
  ).toThrow();
});
test('observed state requires evidence', () => {
  expect(() =>
    StateMappingSchema.parse({
      kind: 'OBSERVED_TRANSITION',
      id: randomUUID(),
      statement: 'Changed',
      operationIds: [],
      evidenceIds: [],
    }),
  ).toThrow();
});
test('execution error is not a finding classification', () => {
  expect(
    FindingSchema.shape.classification.safeParse('EXECUTION ERROR').success,
  ).toBe(false);
});
test('comparison right operands obey operator arity', () => {
  expect(() =>
    PredicateSchema.parse({
      ...predicate,
      assertions: [
        {
          op: 'exists',
          left: { kind: 'status', stepId: 'read' },
          right: { kind: 'literal', value: 200 },
        },
      ],
    }),
  ).toThrow();
});
