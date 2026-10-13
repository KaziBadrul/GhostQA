import { z } from 'zod';
import {
  BudgetLimitsSchema,
  ComparisonSchema,
  JourneyStepSchema,
  RunSchema,
  Id,
  PredicateRefSchema,
} from '../engine/contracts';
import { defaultLimits } from '../lib/default-limits';

export const TargetSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((text) => {
    try {
      const u = new URL(text);
      return (
        ['http:', 'https:'].includes(u.protocol) &&
        !u.username &&
        !u.password &&
        !u.hash &&
        !u.search
      );
    } catch {
      return false;
    }
  }, 'Use an HTTP/HTTPS base URL without credentials, query or fragment');
export const LimitsSchema = BudgetLimitsSchema.extend({
  requests: z.int().min(5).max(10000),
  milliseconds: z.int().min(1000).max(3600000),
  journeys: z.int().min(1).max(100),
  requestTimeoutMs: z.int().min(100).max(30000),
});
export const DraftSchema = z.strictObject({
  targetUrl: TargetSchema.optional(),
  limits: LimitsSchema.default({ ...defaultLimits }),
  exclusions: z.array(z.string().max(256)).max(1000).default([]),
  credentialBindings: RunSchema.shape.credentialBindings.default([]),
  specificationId: Id.optional(),
  resetId: Id.optional(),
  resetVersion: z.int().positive().optional(),
  predicateRef: PredicateRefSchema.optional(),
  predicateApprovalId: Id.optional(),
});
export const CreateProjectSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  targetTemplate: DraftSchema.default({
    limits: { ...defaultLimits },
    exclusions: [],
    credentialBindings: [],
  }),
});
export const EditProjectSchema = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(),
  targetUrl: TargetSchema.optional(),
  limits: LimitsSchema.optional(),
  exclusions: z.array(z.string()).max(1000).optional(),
});
export const ResetInputSchema = z.strictObject({
  resetSteps: z.array(JourneyStepSchema).min(1).max(10),
  checkSteps: z.array(JourneyStepSchema).min(1).max(10),
  resetAssertions: z.array(ComparisonSchema).min(1).max(100),
  baselineAssertions: z.array(ComparisonSchema).min(1).max(100),
});
export const InvariantInputSchema = z.strictObject({
  sourceRef: z.string().trim().min(1).max(1000),
  applicability: z.array(ComparisonSchema).max(100),
  assertions: z.array(ComparisonSchema).min(1).max(100),
});
export const CredentialInputSchema = z.strictObject({
  value: z.string().min(1).max(8192),
  kind: z.enum(['bearer', 'api-key']),
  name: z.string().regex(/^[A-Za-z0-9-]{1,100}$/),
});
export const PreviewInputSchema = z.strictObject({});
export const StartInputSchema = z.strictObject({
  previewId: Id,
  approvalHash: z.string().regex(/^[a-f0-9]{64}$/),
  mutationsAcknowledged: z.literal(true),
});
export type Draft = z.infer<typeof DraftSchema>;
export type ResetInput = z.infer<typeof ResetInputSchema>;
