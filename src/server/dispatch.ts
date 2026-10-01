import { responseExecutionError } from '../engine/execution/response-policy';
import { randomUUID } from 'node:crypto';
import { prepareRequest } from '../engine/execution/prepare';
import {
  createHttpExecutor,
  type TransportResult,
} from '../engine/execution/http-executor';
import { ExecutionIntentSchema } from '../engine/contracts/messages';
import { type Run, type Phase, type JourneyStep } from '../engine/contracts';
import { assertUrl, authorizeOperation } from '../engine/policy/scope';
import type { BudgetManager } from '../engine/budget/manager';
import type { SecretVault } from '../engine/secrets/vault';
import type { RunRepository } from './repositories/runs';
export type { RequestInput } from '../engine/execution/prepare';
export interface DispatchAuthority {
  run: Run;
  budget: BudgetManager;
  vault: SecretVault;
  repository: RunRepository;
  trialId: string;
  phase: Phase;
  step: JourneyStep;
  journeyId: string;
  ordinal: number;
  signal: AbortSignal;
  credentials: ReadonlyMap<string, string>;
  assert(): void;
  advance(result: TransportResult): void;
}
const execute = createHttpExecutor();
export async function dispatch(
  authority: DispatchAuthority,
  value: unknown,
): Promise<TransportResult> {
  authority.assert();
  const intent = ExecutionIntentSchema.parse(value);
  const rawInput = intent.input;
  if (
    intent.runId !== authority.run.id ||
    intent.trialId !== authority.trialId ||
    intent.stepId !== authority.step.id ||
    intent.operationId !== authority.step.operationId
  )
    throw new Error('INTENT MISMATCH');
  const { operation, input, url, headers } = prepareRequest(
    authority.run.apiSnapshot,
    authority.run.scope,
    authority.phase,
    authority.step,
    rawInput,
    authority.run.credentialBindings,
    authority.credentials,
  );
  const id = randomUUID();
  const request = authority.vault.sanitize({
    operationId: operation.id,
    url: url.href,
    headers,
    body: input.body ?? null,
  });
  authority.budget.consume(authority.phase);
  try {
    await authority.repository.intent(
      {
        id,
        runId: intent.runId,
        trialId: intent.trialId,
        stepId: intent.stepId,
        phase: authority.phase,
        ordinal: authority.ordinal,
        request,
        journeyId: authority.journeyId,
      },
      authority.budget.snapshot(),
    );
  } catch {
    throw new Error('STORAGE ERROR');
  }
  authority.assert();
  authorizeOperation(authority.run.scope, operation.id, authority.phase);
  assertUrl(authority.run.scope, url.href);
  const startedAt = new Date().toISOString();
  const started = performance.now();
  let result: TransportResult;
  try {
    const address = authority.run.scope.addresses[0];
    if (!address) throw new Error('NO PINNED ADDRESS');
    result = await execute({
      url,
      address,
      method: operation.method,
      headers,
      body: input.body,
      signal: authority.signal,
      timeoutMs: authority.budget.timeout('request'),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'EXECUTION ERROR';
    const safe = authority.vault.sanitize({ reason });
    await authority.repository.outcome(id, safe, 'EXECUTION ERROR', reason);
    await authority.repository.observation(
      id,
      {
        id: randomUUID(),
        runId: intent.runId,
        trialId: intent.trialId,
        stepId: intent.stepId,
        result: {
          stepId: intent.stepId,
          sanitizedRequest: request,
          sanitizedResponse: safe,
          truncated: false,
          startedAt,
          elapsedMs: performance.now() - started,
          outcome: 'EXECUTION ERROR',
          errorReason: reason,
        },
        stateMappings: [],
      },
      authority.vault,
    );
    throw error;
  }
  const sanitized = authority.vault.sanitize({
    status: result.status,
    headers: result.headers,
    body: result.body,
    text: result.text,
    truncated: result.truncated,
    elapsedMs: result.elapsedMs,
  });
  const errorReason =
    authority.phase === 'RESET' || authority.phase === 'BASELINE'
      ? undefined
      : responseExecutionError(result.status, authority.step.expectedStatuses);
  const outcome = errorReason ? 'EXECUTION ERROR' : 'RESPONSE';
  await authority.repository.outcome(id, sanitized, outcome, errorReason);
  await authority.repository.observation(
    id,
    {
      id: randomUUID(),
      runId: intent.runId,
      trialId: intent.trialId,
      stepId: intent.stepId,
      result: {
        stepId: intent.stepId,
        status: result.status,
        sanitizedRequest: request,
        sanitizedResponse: sanitized,
        truncated: result.truncated,
        startedAt,
        elapsedMs: result.elapsedMs,
        outcome,
        ...(errorReason ? { errorReason } : {}),
      },
      stateMappings: [],
    },
    authority.vault,
  );
  if (errorReason) throw new Error('EXECUTION ERROR');
  authority.advance(result);
  return result;
}
