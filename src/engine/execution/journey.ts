import type { RunSupervisor } from '../../server/run-supervisor';
import {
  ExecutionResultSchema,
  JourneySchema,
  type Run,
  type Journey,
  type ExecutionResult,
} from '../contracts';
import { canonical } from '../detection/predicate';
import type { AdmittedTrial } from '../fresh-state/trial';
import { requestInput } from './requests';
import { extract } from './variables';
export async function executeJourney(
  supervisor: RunSupervisor,
  run: Run,
  journey: Journey,
  trial: AdmittedTrial,
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  try {
    supervisor.assertTrial(trial.id, trial.baseline.id);
    const frozen = supervisor.admittedJourney;
    if (
      canonical(JourneySchema.parse(journey)) !== canonical(frozen) ||
      run.id !== trial.baseline.runId ||
      trial.values.vault !== supervisor.trialVault
    )
      throw new Error('TRIAL IDENTITY MISMATCH');
    for (const [ordinal, step] of frozen.steps.entries()) {
      const startedAt = new Date().toISOString();
      const input = requestInput(step, trial.values);
      const result = await supervisor.dispatchIntent({
        kind: 'EXECUTE',
        runId: trial.baseline.runId,
        trialId: trial.id,
        stepId: step.id,
        operationId: step.operationId,
        input,
      });
      trial.values.results.set(step.id, { ...result, ordinal, operationId: step.operationId, request: input });
      const safe = trial.values.vault.sanitize({
        status: result.status,
        headers: result.headers,
        body: result.body,
        text: result.text,
      });
      results.push(
        ExecutionResultSchema.parse({
          stepId: step.id,
          status: result.status,
          sanitizedRequest: trial.values.vault.sanitize(input),
          sanitizedResponse: safe,
          truncated: result.truncated,
          startedAt,
          elapsedMs: result.elapsedMs,
          outcome: 'RESPONSE',
        }),
      );
      for (const variable of step.extracts) extract(variable, trial.values);
    }
    return results;
  } catch (error) {
    const message =
      supervisor.stopReason ??
      (error instanceof Error ? error.message : 'EXECUTION ERROR');
    const reason = [
      'CANCELLED',
      'BUDGET EXHAUSTED',
      'TIME EXHAUSTED',
      'OWNERSHIP LOST',
      'STORAGE ERROR',
      'WORKER ERROR',
      'SHUTDOWN',
    ].includes(message)
      ? message
      : 'EXECUTION ERROR';
    try {
      await supervisor.stop(reason);
    } catch {
      /* Gate is already closed; interrupted recovery retains durable intent. */
    }
    throw new Error(reason);
  }
}
