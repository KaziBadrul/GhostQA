import { z } from 'zod';
import { Id, Hash, JsonSchema, PhaseSchema } from './common';
export const ApiParameterSchema = z.strictObject({
  name: z.string().min(1).max(256),
  in: z.enum(['path', 'query', 'header']),
  required: z.boolean(),
  schema: JsonSchema,
  style: z.enum(['simple', 'form']),
  explode: z.boolean(),
  sensitive: z.boolean(),
});
export const ApiOperationSchema = z.strictObject({
  id: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  pathTemplate: z.string().startsWith('/'),
  parameters: z.array(ApiParameterSchema),
  requestBody: JsonSchema.optional(),
  responses: JsonSchema,
  eligible: z.boolean(),
  exclusionReasons: z.array(z.string()),
  sanitizedDescription: z.string().max(8192).optional(),
});
export const ApiModelSchema = z
  .strictObject({
    snapshotId: Id,
    contentHash: Hash,
    openapiVersion: z.string().regex(/^3\.[01]\.\d+$/),
    operations: z.array(ApiOperationSchema),
    importDiagnostics: z.array(JsonSchema),
  })
  .refine(
    (x) => new Set(x.operations.map((o) => o.id)).size === x.operations.length,
    'Duplicate operation',
  );
export const OperationPermissionSchema = z
  .strictObject({
    operationId: z.string().min(1),
    category: z.enum(['EXPLORATION', 'RESET', 'BASELINE', 'EXCLUDED']),
    phases: z.array(PhaseSchema),
  })
  .refine(
    (p) =>
      p.category === 'EXCLUDED'
        ? p.phases.length === 0
        : p.phases.length > 0 &&
          p.phases.every((phase) =>
            p.category === 'RESET'
              ? phase === 'RESET'
              : p.category === 'BASELINE'
                ? phase === 'BASELINE'
                : true,
          ),
    'Invalid phase permission',
  );
export const OperationPolicySchema = z
  .array(OperationPermissionSchema)
  .refine(
    (x) => new Set(x.map((p) => p.operationId)).size === x.length,
    'Duplicate permission',
  );
export const FrozenScopeSchema = z.strictObject({
  origin: z.url(),
  hostname: z.string().min(1),
  port: z.int().min(1).max(65535),
  basePathSegments: z.array(z.string()),
  addresses: z
    .array(
      z.strictObject({
        ip: z.string(),
        family: z.union([z.literal(4), z.literal(6)]),
      }),
    )
    .min(1),
  operationIds: z.array(z.string()),
  operationPolicy: OperationPolicySchema,
  approvalId: Id,
  mutationsAcknowledged: z.boolean(),
});
export type ApiParameter = z.infer<typeof ApiParameterSchema>;
export type ApiOperation = z.infer<typeof ApiOperationSchema>;
export type ApiModel = z.infer<typeof ApiModelSchema>;
export type FrozenScope = z.infer<typeof FrozenScopeSchema>;
