import { z } from 'zod';
import { Id, PhaseSchema, JsonSchema } from './common';
import { ApiModelSchema, FrozenScopeSchema } from './api';
import { ResetConfigurationSchema } from './journey';
import { PredicateSchema } from './predicate';
export const BudgetLimitsSchema = z.strictObject({
  requests: z.int().positive(),
  milliseconds: z.int().positive(),
  journeys: z.int().positive(),
  steps: z.int().min(1).max(10),
  requestTimeoutMs: z.int().positive(),
  modelTimeoutMs: z.int().positive().max(30000),
});
export const RunBudgetSchema = z.strictObject({
  limits: BudgetLimitsSchema,
  usedRequests: z.int().nonnegative(),
  requestsByPhase: z.record(PhaseSchema, z.int().nonnegative()),
  usedExplorationJourneys: z.int().nonnegative(),
  modelCalls: z.int().nonnegative(),
  stagnantRounds: z.int().nonnegative(),
  acceptedAt: z.iso.datetime(),
  deadlineAt: z.iso.datetime(),
});
export const RunSchema = z.strictObject({
  id: Id,
  projectId: Id,
  apiSnapshot: ApiModelSchema,
  scope: FrozenScopeSchema,
  reset: ResetConfigurationSchema,
  predicates: z.array(PredicateSchema),
  budget: RunBudgetSchema,
  status: z.enum([
    'ACCEPTED',
    'RUNNING',
    'STOPPING',
    'COMPLETED',
    'STOPPED',
    'INTERRUPTED',
  ]),
  stopReason: z.string().optional(),
  cancelRequestedAt: z.iso.datetime().optional(),
  credentialBindings: z
    .array(
      z.strictObject({
        slot: z.string().min(1),
        version: z.int().positive(),
        kind: z.enum(['bearer', 'api-key']),
        location: z.literal('header'),
        name: z.string().min(1),
      }),
    )
    .default([]),
  modelConfiguration: JsonSchema,
});
export type BudgetLimits = z.infer<typeof BudgetLimitsSchema>;
export type RunBudget = z.infer<typeof RunBudgetSchema>;
export type Run = z.infer<typeof RunSchema>;
export type TestSession = Run;
