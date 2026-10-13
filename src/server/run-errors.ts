import type { DemoFailureCode } from './demo/contracts';
import { errorGuidance } from '../lib/error-guidance';
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}
export function modelFailureCode(value: unknown): DemoFailureCode | undefined {
  const outer = record(value),
    telemetry = outer.telemetry ? record(outer.telemetry) : outer;
  const diagnostic = record(telemetry.diagnostic ?? outer.diagnostic);
  const status = diagnostic.apiStatus,
    http = diagnostic.httpStatus,
    kind = telemetry.failureKind;
  if (status === 'RESOURCE_EXHAUSTED' || http === 429)
    return 'MODEL QUOTA EXHAUSTED';
  if (kind === 'CANCELLED') return 'CANCELLED';
  if (kind === 'TIMEOUT' || kind === 'INVALID_TIMEOUT') return 'MODEL TIMEOUT';
  if (status === 'INVALID_ARGUMENT' || http === 400)
    return 'MODEL REQUEST REJECTED';
  if (
    kind === 'MODEL_CONFIGURATION' ||
    [
      'UNAUTHENTICATED',
      'PERMISSION_DENIED',
      'NOT_FOUND',
      'UNAVAILABLE',
    ].includes(String(status)) ||
    [401, 403, 404, 503].includes(Number(http))
  )
    return 'MODEL UNAVAILABLE';
  if (kind === 'PROVIDER_OUTPUT') return 'MODEL INVALID OUTPUT';
  if (kind === 'CONTRACT_VALIDATION') return 'MODEL INVALID PLAN';
  if (kind === 'PROVIDER_REQUEST' || kind === 'PROVIDER_EXCEPTION')
    return 'MODEL UNAVAILABLE';
  return undefined;
}
export function runFailureCode(
  reason: string,
  telemetry?: unknown,
): DemoFailureCode {
  if (reason === 'MODEL ERROR' || reason === 'MODEL PLAN ERROR')
    return (
      modelFailureCode(telemetry) ??
      (reason === 'MODEL PLAN ERROR' ? 'MODEL INVALID PLAN' : 'MODEL ERROR')
    );
  const codes: Record<string, DemoFailureCode> = {
    'SUPERVISOR BUSY': 'ANOTHER RUN IN PROGRESS',
    'OWNERSHIP LOST': 'ENGINE ERROR',
    'WORKER ERROR': 'EXECUTION ERROR',
    SHUTDOWN: 'CANCELLED',
    CANCELLED: 'CANCELLED',
    'BASELINE ERROR': 'BASELINE ERROR',
    'STORAGE ERROR': 'STORAGE ERROR',
    'PROJECT REQUIRED': 'STORAGE ERROR',
    'BUDGET EXHAUSTED': 'BUDGET EXHAUSTED',
    'TIME EXHAUSTED': 'TIME EXHAUSTED',
    'EXECUTION ERROR': 'EXECUTION ERROR',
    STAGNATION: 'STAGNATION',
    'INVALID FIXTURE': 'INVALID FIXTURE',
  };
  return codes[reason] ?? 'ENGINE ERROR';
}
export function runFailure(reason: string, telemetry?: unknown) {
  const code = runFailureCode(reason, telemetry),
    info = errorGuidance(code);
  return { code, detail: `${info.message} ${info.action}` };
}
