import { z } from 'zod';
import { Id, Hash, OperandSchema } from './common';
export const ComparisonSchema = z
  .strictObject({
    op: z.enum(['equals', 'not-equals', 'in', 'exists', 'absent', 'before']),
    left: OperandSchema,
    right: OperandSchema.optional(),
  })
  .refine(
    (c) =>
      c.op === 'exists' || c.op === 'absent'
        ? c.right === undefined
        : c.right !== undefined &&
          (c.op !== 'before' || (c.left.kind === 'step-index' && c.right.kind === 'step-index')) &&
          (c.op !== 'in' ||
            (c.right.kind === 'literal' && Array.isArray(c.right.value))),
    'Invalid comparison operands',
  );
export const PredicateSchema = z.strictObject({
  id: Id,
  version: z.int().positive(),
  canonicalHash: Hash,
  source: z.enum(['SPEC_ASSERTION', 'DEVELOPER', 'AGENT_HYPOTHESIS']),
  sourceRef: z.string().min(1),
  approvalRef: Id.optional(),
  applicability: z.array(ComparisonSchema).max(100),
  assertions: z.array(ComparisonSchema).min(1).max(100),
});
export const BaselineAssertionSchema = z.strictObject({
  id: Id,
  predicate: PredicateSchema,
});
export type Predicate = z.infer<typeof PredicateSchema>;
export type BaselineAssertion = z.infer<typeof BaselineAssertionSchema>;
