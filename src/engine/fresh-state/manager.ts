import { z } from 'zod';
import { JsonSchema } from '../contracts';
import type { RunSupervisor } from '../../server/run-supervisor';
import type { Run, Journey, Phase, Json } from '../contracts';
import { requestInput } from '../execution/requests';
import { extract, type ValueContext } from '../execution/variables';
import type { AdmittedTrial } from './trial';
// Preserve admitted trial identity when setup fails before any dispatch record.
// Reasons remain allowlisted engine outcomes; no raw target exception is retained.
export class FreshStateError extends Error {
  constructor(
    reason: string,
    readonly trialId?: string,
  ) {
    super(reason);
  }
}
export async function establishFreshState(
  supervisor: RunSupervisor,
  run: Run,
  journey: Journey,
  phase: Exclude<Phase, 'RESET' | 'BASELINE'>,
  inputs: Record<string, Json>,
): Promise<AdmittedTrial> {
  let establishing = false;
  let trialId: string | undefined;
  try {
    const id = supervisor.admitTrial(journey, phase);
    trialId = id;
    const controls = supervisor.trialControls;
    if (run.id !== controls.runId) throw new Error('RUN IDENTITY MISMATCH');
    const values: ValueContext = {
      vault: supervisor.trialVault,
      results: new Map(),
      inputs: z.record(z.string(), JsonSchema).parse(inputs),
    };
    for (const variable of journey.variables) extract(variable, values);
    establishing = true;
    for (const step of [
      ...controls.reset.resetSteps,
      ...controls.reset.checkSteps,
    ]) {
      const result = await supervisor.dispatchIntent({
        kind: 'EXECUTE',
        runId: controls.runId,
        trialId: id,
        stepId: step.id,
        operationId: step.operationId,
        input: requestInput(step, values),
      });
      values.results.set(step.id, result);
      // Supervisor extracts controls before evaluating their assertions, into the shared vault.
    }
    const baseline = await supervisor.establishBaseline();
    return { id, baseline, values };
  } catch (error) {
    const message =
      supervisor.stopReason ??
      (error instanceof Error ? error.message : 'EXECUTION ERROR');
    const preserved = [
      'BUDGET EXHAUSTED',
      'TIME EXHAUSTED',
      'JOURNEY LIMIT',
      'CANCELLED',
      'OWNERSHIP LOST',
      'WORKER ERROR',
      'SHUTDOWN',
      'STORAGE ERROR',
    ];
    const reason = preserved.includes(message)
      ? message
      : establishing
        ? 'BASELINE ERROR'
        : 'EXECUTION ERROR';
    try {
      await supervisor.stop(reason);
    } catch {
      /* Closed gate stays closed if persistence is unavailable. */
    }
    throw new FreshStateError(reason, trialId);
  }
}
