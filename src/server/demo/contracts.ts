// Submission/demo presentation contracts. These describe what the product
// surface may show. They carry no dispatch, planning, or authorization
// capability and are never consumed by the engine.
import { z } from 'zod';

export const DemoFixtureIdSchema = z.enum([
  'order-lifecycle',
  'inventory',
  'workflow',
]);
export type DemoFixtureId = z.infer<typeof DemoFixtureIdSchema>;

export const DemoFixtureSchema = z.strictObject({
  id: DemoFixtureIdSchema,
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  invariant: z.string().min(1),
  explorationOperations: z.array(z.string().min(1)).min(1),
});
export type DemoFixture = z.infer<typeof DemoFixtureSchema>;

export const StartRunRequestSchema = z.strictObject({
  fixture: DemoFixtureIdSchema,
});
export type StartRunRequest = z.infer<typeof StartRunRequestSchema>;

export const DemoRunStateSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
]);
export type DemoRunState = z.infer<typeof DemoRunStateSchema>;

export const DemoOutcomeSchema = z.enum([
  'PENDING',
  'VIOLATION CONFIRMED',
  'NO CONFIRMED VIOLATION',
  'NOT EVALUABLE',
]);
export type DemoOutcome = z.infer<typeof DemoOutcomeSchema>;

export const DemoStageSchema = z.enum([
  'QUEUED',
  'ADMITTING RUN',
  'RESETTING TARGET',
  'VERIFYING BASELINE',
  'PLANNING JOURNEY',
  'EXECUTING JOURNEY',
  'CONFIRMING FROM FRESH STATE',
  'MINIMIZING',
  'LOADING EVIDENCE',
  'GENERATING REPORT',
  'VERIFYING ARTIFACT',
  'PACKAGING ARTIFACT',
  'COMPLETE',
  'FAILED',
]);
export type DemoStage = z.infer<typeof DemoStageSchema>;

export const DemoCountersSchema = z.strictObject({
  usedRequests: z.int().nonnegative(),
  requestsByPhase: z.record(z.string(), z.int().nonnegative()),
  usedExplorationJourneys: z.int().nonnegative(),
  modelCalls: z.int().nonnegative(),
  stagnantRounds: z.int().nonnegative(),
});
export type DemoCounters = z.infer<typeof DemoCountersSchema>;

export const DemoFindingSchema = z.strictObject({
  id: z.string().min(1),
  classification: z.string().min(1),
  consistent: z.boolean(),
  predicateSourceRef: z.string().min(1),
  predicateHash: z.string().min(1),
  originalLength: z.int().positive().nullable(),
  minimizedLength: z.int().positive().nullable(),
  minimizationStop: z.string().min(1).nullable(),
  artifactStatus: z.string().nullable(),
});
export type DemoFinding = z.infer<typeof DemoFindingSchema>;

// Only engine-issued, allowlisted codes are surfaced. Raw exception text,
// provider payloads, and target-controlled strings never reach this record.
export const DemoFailureCodeSchema = z.enum([
  'INVALID FIXTURE',
  'ANOTHER RUN IN PROGRESS',
  'TARGET UNAVAILABLE',
  'MODEL UNAVAILABLE',
  'MODEL QUOTA EXHAUSTED',
  'MODEL ERROR',
  'STAGNATION',
  'BUDGET EXHAUSTED',
  'TIME EXHAUSTED',
  'BASELINE ERROR',
  'EXECUTION ERROR',
  'STORAGE ERROR',
  'CANCELLED',
  'ENGINE ERROR',
]);
export type DemoFailureCode = z.infer<typeof DemoFailureCodeSchema>;

export const DemoFailureSchema = z.strictObject({
  code: DemoFailureCodeSchema,
  detail: z.string().min(1),
});
export type DemoFailure = z.infer<typeof DemoFailureSchema>;

export const DemoRunRecordSchema = z.strictObject({
  id: z.string().min(1),
  fixtureId: DemoFixtureIdSchema,
  mode: z.literal('LIVE'),
  state: DemoRunStateSchema,
  stage: DemoStageSchema,
  outcome: DemoOutcomeSchema,
  startedAt: z.string().min(1),
  finishedAt: z.string().nullable(),
  counters: DemoCountersSchema.nullable(),
  stopReason: z.string().nullable(),
  finding: DemoFindingSchema.nullable(),
  failure: DemoFailureSchema.nullable(),
  reportAvailable: z.boolean(),
});
export type DemoRunRecord = z.infer<typeof DemoRunRecordSchema>;

export const DemoRunSummarySchema = DemoRunRecordSchema.pick({
  id: true,
  fixtureId: true,
  mode: true,
  state: true,
  stage: true,
  outcome: true,
  startedAt: true,
  finishedAt: true,
  counters: true,
  finding: true,
});
export type DemoRunSummary = z.infer<typeof DemoRunSummarySchema>;

export const DemoRunListSchema = z.strictObject({
  activeRunId: z.string().nullable(),
  runs: z.array(DemoRunSummarySchema),
});
export type DemoRunList = z.infer<typeof DemoRunListSchema>;

export const RecordedRunIdSchema = z
  .string()
  .regex(/^gate5-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9]{1,3}$/);
export type RecordedRunId = z.infer<typeof RecordedRunIdSchema>;

export const RecordedRunSummarySchema = z.strictObject({
  id: RecordedRunIdSchema,
  seriesId: z.string().min(1),
  fixtureId: DemoFixtureIdSchema,
  variant: z.enum(['faulty', 'repaired']),
  discoveryStatus: z.string().min(1),
  confirmationStatus: z.string().min(1),
  artifactStatus: z.string().min(1),
  stopReason: z.string().min(1),
  requests: z.int().nonnegative(),
  modelCalls: z.int().nonnegative(),
  originalLength: z.int().positive().nullable(),
  minimizedLength: z.int().positive().nullable(),
  runId: z.string().min(1),
});
export type RecordedRunSummary = z.infer<typeof RecordedRunSummarySchema>;

export const RecordedRunListSchema = z.strictObject({
  runs: z.array(RecordedRunSummarySchema),
});
export type RecordedRunList = z.infer<typeof RecordedRunListSchema>;