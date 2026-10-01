import { z } from 'zod';
import { JourneySchema } from './journey';
import {
  BaselineEvidenceSchema,
  EvidenceSchema,
  ObservationSchema,
  FindingSchema,
} from './execution';
export const MinimizationFailureSchema = z.enum([
  'EXECUTION ERROR',
  'CANCELLED',
  'BASELINE ERROR',
  'BUDGET EXHAUSTED',
  'TIME EXHAUSTED',
  'OWNERSHIP LOST',
  'STORAGE ERROR',
  'SHUTDOWN',
  'WORKER ERROR',
]);
export const MinimizationAttemptSchema = z.strictObject({
  candidate: JourneySchema,
  removedStepId: z.string().min(1),
  accepted: z.boolean(),
  reason: z.string().min(1),
  trialId: z.uuid().optional(),
  baseline: BaselineEvidenceSchema.optional(),
  evidence: EvidenceSchema.optional(),
  observations: z.array(ObservationSchema),
  executionOutcome: MinimizationFailureSchema.optional(),
});
export const MinimizationResultSchema = z.strictObject({
  finding: FindingSchema,
  best: JourneySchema,
  originalLength: z.int().positive(),
  bestLength: z.int().positive(),
  attempts: z.array(MinimizationAttemptSchema),
  stopReason: z.string().min(1),
  locallyIrreducible: z.boolean(),
});
export type MinimizationAttempt = z.infer<typeof MinimizationAttemptSchema>;
export type MinimizationResult = z.infer<typeof MinimizationResultSchema>;
