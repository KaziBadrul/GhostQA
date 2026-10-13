import { expect, test } from 'vitest';
import { z } from 'zod';
import {
  runFailure,
  runFailureCode,
  modelFailureCode,
} from '../../src/server/run-errors';
import { describeError, errorGuidance } from '../../src/lib/error-guidance';
import { validationIssues } from '../../src/lib/validation-issues';
import { DemoFailureSchema } from '../../src/server/demo/contracts';
test.each([
  [{ failureKind: 'TIMEOUT' }, 'MODEL TIMEOUT'],
  [
    { failureKind: 'PROVIDER_REQUEST', diagnostic: { httpStatus: 429 } },
    'MODEL QUOTA EXHAUSTED',
  ],
  [
    {
      failureKind: 'PROVIDER_REQUEST',
      diagnostic: { apiStatus: 'INVALID_ARGUMENT', httpStatus: 400 },
    },
    'MODEL REQUEST REJECTED',
  ],
  [
    { failureKind: 'PROVIDER_REQUEST', diagnostic: { httpStatus: 401 } },
    'MODEL UNAVAILABLE',
  ],
  [
    { failureKind: 'PROVIDER_OUTPUT', diagnostic: { stage: 'RESPONSE_PARSE' } },
    'MODEL INVALID OUTPUT',
  ],
  [
    {
      failureKind: 'PROVIDER_OUTPUT',
      diagnostic: { stage: 'CONTRACT_VALIDATION' },
    },
    'MODEL INVALID OUTPUT',
  ],
  [{ failureKind: 'CONTRACT_VALIDATION' }, 'MODEL INVALID PLAN'],
  [{ failureKind: 'CANCELLED' }, 'CANCELLED'],
] as const)(
  'classifies sanitized model telemetry %j as %s',
  (telemetry, code) => {
    expect(modelFailureCode(telemetry)).toBe(code);
    expect(modelFailureCode({ telemetry })).toBe(code);
    expect(runFailureCode('MODEL ERROR', telemetry)).toBe(code);
    expect(
      DemoFailureSchema.safeParse(runFailure('MODEL ERROR', telemetry)).success,
    ).toBe(true);
    expect(errorGuidance(code).action.length).toBeGreaterThan(20);
  },
);
test('successful planning diagnostics do not override later execution failures', () => {
  expect(runFailureCode('BASELINE ERROR', { failureKind: 'TIMEOUT' })).toBe(
    'BASELINE ERROR',
  );
  expect(runFailureCode('CANCELLED', { failureKind: 'PROVIDER_OUTPUT' })).toBe(
    'CANCELLED',
  );
  expect(runFailureCode('MODEL ERROR', {})).toBe('MODEL ERROR');
  expect(runFailureCode('MODEL PLAN ERROR', {})).toBe('MODEL INVALID PLAN');
});
test('raw provider text and unknown exceptions are not surfaced', () => {
  const secret = 'password-123-PRIVATE';
  const failure = runFailure(secret, {
    failureKind: secret,
    diagnostic: { message: secret, httpStatus: 500 },
  });
  expect(failure.code).toBe('ENGINE ERROR');
  expect(JSON.stringify(failure)).not.toContain(secret);
  expect(JSON.stringify(describeError(Error(secret)))).not.toContain(secret);
});
test('field guidance never includes rejected values or untrusted extra-field names', () => {
  const secret = 'credential-private';
  const parsed = z
    .strictObject({ targetUrl: z.url() })
    .safeParse({ targetUrl: secret, [secret]: secret });
  if (parsed.success) throw Error('Expected invalid input');
  const details = validationIssues(parsed.error);
  expect(details.some((issue) => issue.field === 'targetUrl')).toBe(true);
  expect(JSON.stringify(details)).not.toContain(secret);
  const record = z
    .record(z.string(), z.number())
    .safeParse({ [secret]: 'invalid' });
  if (record.success) throw Error('Expected invalid record');
  expect(validationIssues(record.error)[0]?.field).toBe('field');
});

test('visible planning diagnostics preserve useful fields but omit raw text and arbitrary paths', async () => {
  const { planningDiagnostics } =
    await import('../../src/lib/planning-diagnostics');
  const secret = 'private-secret-value';
  const values = [
    {
      telemetry: {
        failureKind: 'PROVIDER_OUTPUT',
        diagnostic: {
          stage: 'CONTRACT_VALIDATION',
          message: secret,
          contractIssues: [
            { code: 'invalid_format', path: ['mappings', 0, 'id'] },
            { code: 'invalid_type', path: [secret] },
          ],
        },
      },
    },
  ];
  const result = planningDiagnostics(values);
  expect(result[0]?.contractIssues[0]?.path).toBe('mappings.0.id');
  expect(result[0]?.contractIssues[1]?.path).toBe('field');
  expect(JSON.stringify(result)).not.toContain(secret);
  expect(planningDiagnostics([{ telemetry: { failureKind: secret } }])).toEqual(
    [],
  );
});
