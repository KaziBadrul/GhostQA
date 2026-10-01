import { z } from 'zod';
import {
  Id,
  Name,
  JsonSchema,
  PhaseSchema,
  PredicateRefSchema,
  PredicateOutcomeSchema,
} from './common';
import { ApiModelSchema, FrozenScopeSchema } from './api';
import { StateMappingSchema } from './journey';
import { PredicateSchema } from './predicate';
export const ExecutionContextSchema = z.strictObject({
  runId: Id,
  trialId: Id,
  phase: PhaseSchema,
  scope: FrozenScopeSchema,
  apiModel: ApiModelSchema,
  predicate: PredicateSchema,
  baselineEvidenceId: Id.optional(),
  signal: z.instanceof(AbortSignal),
});
export const ExecutionResultSchema = z.strictObject({
  stepId: Name,
  status: z.int().min(100).max(599).optional(),
  sanitizedRequest: JsonSchema,
  sanitizedResponse: JsonSchema,
  truncated: z.boolean(),
  startedAt: z.iso.datetime(),
  elapsedMs: z.number().nonnegative(),
  outcome: z.enum(['RESPONSE', 'EXECUTION ERROR', 'INTERRUPTED']),
  errorReason: z.string().optional(),
});
export const ObservationSchema = z.strictObject({
  id: Id,
  runId: Id,
  trialId: Id,
  stepId: Name,
  result: ExecutionResultSchema,
  stateMappings: z.array(StateMappingSchema),
});
export const BaselineEvidenceSchema = z.strictObject({
  id: Id,
  runId: Id,
  trialId: Id,
  resetStepIds: z.array(Name),
  checkStepIds: z.array(Name),
  verdict: z.literal('SATISFIED'),
  assertionIds: z.array(Id).min(1),
});
export const EvidenceSchema = z
  .strictObject({
    id: Id,
    runId: Id,
    trialId: Id,
    phase: PhaseSchema,
    predicateRef: PredicateRefSchema,
    baselineEvidenceId: Id,
    observationIds: z.array(Id),
    outcome: PredicateOutcomeSchema,
    symbolicOperands: JsonSchema,
    reason: z.string().optional(),
  })
  .refine((x) => x.id !== x.baselineEvidenceId, 'Self-referencing evidence');
export const FindingSchema = z.strictObject({
  id: Id,
  projectId: Id,
  initialEvidenceId: Id,
  replayEvidenceIds: z.array(Id),
  predicateRef: PredicateRefSchema,
  classification: z.enum([
    'OBSERVED VIOLATION',
    'CONFIRMED',
    'INCONCLUSIVE',
    'NON-REPRODUCED',
  ]),
  consistent: z.boolean(),
  transitions: z.array(JsonSchema),
  originalJourneyId: Id,
  minimizedJourneyId: Id.optional(),
  minimizationStop: z.string().optional(),
});
export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
export type Observation = z.infer<typeof ObservationSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type BaselineEvidence = z.infer<typeof BaselineEvidenceSchema>;
export type Finding = z.infer<typeof FindingSchema>;
