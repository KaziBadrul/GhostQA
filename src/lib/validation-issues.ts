import { z } from 'zod';
import type { FieldIssue } from './error-guidance';
const fields = new Set([
  'name',
  'targetTemplate',
  'targetUrl',
  'limits',
  'requests',
  'milliseconds',
  'journeys',
  'steps',
  'requestTimeoutMs',
  'modelTimeoutMs',
  'exclusions',
  'value',
  'kind',
  'location',
  'slot',
  'version',
  'resetSteps',
  'checkSteps',
  'resetAssertions',
  'baselineAssertions',
  'id',
  'operationId',
  'parameters',
  'body',
  'bodyBindings',
  'extracts',
  'expectedStatuses',
  'op',
  'left',
  'right',
  'stepId',
  'pointer',
  'sourceRef',
  'applicability',
  'assertions',
  'hash',
  'previewId',
  'approvalHash',
  'mutationsAcknowledged',
  'format',
  'expectedType',
  'source',
  'sensitive',
  'variable',
]);
// Never return Zod messages, rejected values, arbitrary record keys or extra-field names.
export function validationIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.slice(0, 8).map((issue) => ({
    field:
      issue.path
        .slice(0, 8)
        .map((part) =>
          typeof part === 'number'
            ? part
            : fields.has(String(part))
              ? String(part)
              : 'field',
        )
        .join('.') || 'definition',
    message:
      issue.code === 'unrecognized_keys'
        ? 'Remove unsupported fields.'
        : issue.code === 'too_small'
          ? 'A required value is missing or below its minimum.'
          : issue.code === 'too_big'
            ? 'Reduce this value to the allowed limit.'
            : issue.code === 'invalid_type'
              ? 'Use the required JSON type.'
              : 'Use a supported value in the required format.',
  }));
}
