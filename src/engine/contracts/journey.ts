import { z } from 'zod';
import {
  Id,
  Name,
  JsonSchema,
  OperandSchema,
  PredicateRefSchema,
} from './common';
import { BaselineAssertionSchema } from './predicate';
export const StateVariableSchema = z.strictObject({
  name: Name,
  expectedType: z.enum([
    'string',
    'integer',
    'number',
    'boolean',
    'object',
    'array',
    'null',
  ]),
  source: z.union([
    OperandSchema,
    z.strictObject({ kind: z.literal('input'), key: z.string().min(1) }),
    z.strictObject({
      kind: z.literal('generate'),
      generator: z.enum(['email', 'uuid', 'bounded-literal']),
      constraints: JsonSchema,
    }),
  ]),
  sensitive: z.boolean(),
});
export const StateMappingSchema = z
  .strictObject({
    kind: z.enum([
      'DECLARED',
      'INFERRED_DEPENDENCY',
      'HYPOTHESIZED_STATE',
      'OBSERVED_TRANSITION',
    ]),
    id: Id,
    statement: z.string(),
    operationIds: z.array(z.string()),
    rationale: z.string().optional(),
    evidenceIds: z.array(Id),
  })
  .refine(
    (x) =>
      x.kind === 'OBSERVED_TRANSITION'
        ? x.evidenceIds.length > 0
        : x.kind === 'DECLARED' || Boolean(x.rationale),
    'Missing provenance support',
  );
export const JourneyStepSchema = z.strictObject({
  id: Name,
  operationId: z.string().min(1),
  parameters: z.array(
    z.strictObject({
      location: z.enum(['path', 'query', 'header']),
      name: z.string(),
      value: OperandSchema,
    }),
  ),
  body: JsonSchema.optional(),
  bodyBindings: z.array(
    z.strictObject({ pointer: z.string().max(1024), value: OperandSchema }),
  ),
  extracts: z.array(StateVariableSchema),
  expectedStatuses: z.array(z.int().min(100).max(599)).min(1),
});
export const JourneySchema = z
  .strictObject({
    id: Id,
    steps: z.array(JourneyStepSchema).min(1).max(10),
    variables: z.array(StateVariableSchema),
    predicateRef: PredicateRefSchema,
    rationale: z.string().max(8192),
    dependencies: z.array(
      z.strictObject({ producer: Name, consumer: Name, variable: Name }),
    ),
  })
  .refine(
    (x) =>
      new Set(x.steps.map((s) => s.id)).size === x.steps.length &&
      new Set(x.variables.map((v) => v.name)).size === x.variables.length,
    'Duplicate step/variable',
  );
export const ResetConfigurationSchema = z.strictObject({
  id: Id,
  version: z.int().positive(),
  resetSteps: z.array(JourneyStepSchema).min(1).max(10),
  resetAssertions: z.array(BaselineAssertionSchema),
  checkSteps: z.array(JourneyStepSchema).max(10),
  baselineAssertions: z.array(BaselineAssertionSchema).min(1),
});
export type StateVariable = z.infer<typeof StateVariableSchema>;
export type StateMapping = z.infer<typeof StateMappingSchema>;
export type JourneyStep = z.infer<typeof JourneyStepSchema>;
export type Journey = z.infer<typeof JourneySchema>;
export type ResetConfiguration = z.infer<typeof ResetConfigurationSchema>;
