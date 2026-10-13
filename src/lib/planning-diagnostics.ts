import { z } from 'zod';
const diagnostic = z.object({
  stage: z
    .enum(['REQUEST', 'RESPONSE_PARSE', 'CONTRACT_VALIDATION'])
    .optional(),
  validationRule: z
    .enum([
      'REPLY SCHEMA',
      'OUTPUT SIZE',
      'PROPOSAL SCHEMA',
      'JOURNEY VALIDATION',
      'PROVIDER IDENTITY',
      'MAPPING OPERATIONS',
      'PREDICATE REFERENCE',
      'PREDICATE STEP',
      'STEP LIMIT',
      'SANITIZATION',
      'UNKNOWN OPERATION',
      'DUPLICATE PARAMETER',
      'UNKNOWN PARAMETER',
      'INVALID PARAMETER NAME',
      'INVALID PARAMETER',
      'MISSING PARAMETER',
      'MISSING BODY',
      'UNDECLARED BODY',
      'INVALID BODY',
      'INVALID BODY POINTER',
      'INVALID DEPENDENCY',
      'DUPLICATE VARIABLE',
      'DUPLICATE STEP',
      'INVALID EXTRACTION',
      'PREDICATE HASH MISMATCH',
    ])
    .optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
  apiStatus: z
    .enum([
      'INVALID_ARGUMENT',
      'UNAUTHENTICATED',
      'PERMISSION_DENIED',
      'NOT_FOUND',
      'RESOURCE_EXHAUSTED',
      'UNAVAILABLE',
      'INTERNAL',
      'UNKNOWN',
    ])
    .optional(),
  contractIssues: z
    .array(
      z.object({
        code: z.enum([
          'invalid_type',
          'invalid_value',
          'invalid_format',
          'too_big',
          'too_small',
          'unrecognized_keys',
          'not_multiple_of',
          'invalid_union',
          'invalid_key',
          'invalid_element',
          'custom',
        ]),
        path: z.array(z.union([z.string(), z.number()])).max(20),
      }),
    )
    .max(10)
    .optional(),
});
const telemetry = z.object({
  failureKind: z.enum([
    'MODEL_CONFIGURATION',
    'INVALID_TIMEOUT',
    'TIMEOUT',
    'CANCELLED',
    'PROVIDER_REQUEST',
    'PROVIDER_OUTPUT',
    'PROVIDER_EXCEPTION',
    'CONTRACT_VALIDATION',
  ]),
  diagnostic: diagnostic.optional(),
});
const fields = new Set([
  'journey',
  'mappings',
  'hypotheses',
  'id',
  'operationId',
  'parameters',
  'value',
  'variables',
  'body',
  'bodyBindings',
  'extracts',
  'expectedStatuses',
  'predicateRef',
  'source',
  'dependencies',
  'producer',
  'consumer',
  'variable',
  'pointer',
  'rationale',
  'name',
  'kind',
  'location',
  'version',
  'hash',
  'assertions',
  'applicability',
]);
export function planningDiagnostics(evidence: unknown[]) {
  return evidence
    .slice(-100)
    .flatMap((value) => {
      if (!value || typeof value !== 'object' || !('telemetry' in value))
        return [];
      const parsed = telemetry.safeParse(value.telemetry);
      if (!parsed.success) return [];
      return [
        {
          failureKind: parsed.data.failureKind,
          ...parsed.data.diagnostic,
          contractIssues:
            parsed.data.diagnostic?.contractIssues?.map((issue) => ({
              code: issue.code,
              path: issue.path
                .map((part) =>
                  typeof part === 'number' && part >= 0 && part < 1000
                    ? String(part)
                    : fields.has(String(part))
                      ? String(part)
                      : 'field',
                )
                .join('.'),
            })) ?? [],
        },
      ];
    })
    .slice(-8);
}
