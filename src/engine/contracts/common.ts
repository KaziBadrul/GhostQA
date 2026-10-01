import { z } from 'zod';
export const Id = z.uuid();
export const Hash = z.string().regex(/^[a-f0-9]{64}$/);
export const Name = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
export const JsonSchema = z.json();
export type Json = z.infer<typeof JsonSchema>;
export const PhaseSchema = z.enum([
  'RESET',
  'BASELINE',
  'EXPLORATION',
  'REPLAY',
  'MINIMIZATION',
  'ARTIFACT',
]);
export type Phase = z.infer<typeof PhaseSchema>;
export const PredicateOutcomeSchema = z.enum([
  'SATISFIED',
  'VIOLATED',
  'NOT APPLICABLE',
  'UNEVALUABLE',
]);
export const PredicateRefSchema = z.strictObject({
  id: Id,
  version: z.int().positive(),
  hash: Hash,
});
export const OperandSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('step-index'), stepId: Name }),
  z.strictObject({ kind: z.literal('operation'), stepId: Name }),
  z.strictObject({ kind: z.literal('request'), stepId: Name, pointer: z.string().max(1024) }),
  z.strictObject({ kind: z.literal('literal'), value: JsonSchema }),
  z.strictObject({ kind: z.literal('variable'), name: Name }),
  z.strictObject({ kind: z.literal('status'), stepId: Name }),
  z.strictObject({
    kind: z.literal('json'),
    stepId: Name,
    pointer: z.string().max(1024),
  }),
  z.strictObject({
    kind: z.literal('header'),
    stepId: Name,
    name: z.string().min(1).max(256),
  }),
]);
export type Operand = z.infer<typeof OperandSchema>;
