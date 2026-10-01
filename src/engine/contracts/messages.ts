import { z } from 'zod';
import { Id, Name, JsonSchema } from './common';
export const ExecutionIntentSchema = z.strictObject({
  kind: z.literal('EXECUTE'),
  runId: Id,
  trialId: Id,
  stepId: Name,
  operationId: z.string().min(1),
  input: JsonSchema,
});
export const WorkerMessageSchema = z.discriminatedUnion('kind', [
  ExecutionIntentSchema,
  z.strictObject({ kind: z.literal('READY') }),
  z.strictObject({ kind: z.literal('STOPPED'), reason: z.string().max(128) }),
]);
export type ExecutionIntent = z.infer<typeof ExecutionIntentSchema>;
