import { randomUUID } from 'node:crypto';
import type { RunSupervisor } from '../../server/run-supervisor';
import type {
  Json,
  Observation,
  Evidence,
  StateMapping,
  Finding,
} from '../contracts';
import type { ReasoningProvider } from '../planning/provider';
import {
  unpackProposal,
  declaredMappings,
  inferredMappings,
  observedMappings,
  hypothesisHash,
} from '../mapping/state';
import { establishFreshState } from '../fresh-state/manager';
import { executeJourney } from '../execution/journey';
import { evaluatePredicate } from '../detection/predicate';
import { validatePredicate } from '../validation/predicate';
import { saveEvidence } from '../../server/repositories/evidence';

export async function explore(
  supervisor: RunSupervisor,
  provider: ReasoningProvider,
  inputs: Record<string, Json> = {},
  stopOnCandidate = false,
): Promise<{ stopReason: string; trials: Evidence[]; candidate?: Finding }> {
  const seen = new Set<string>();
  const trials: Evidence[] = [];
  let mappings: StateMapping[] = [];
  let observations: Observation[] = [];
  try {
    mappings = declaredMappings(supervisor.snapshot.apiSnapshot);
    for (;;) {
      supervisor.assertAuthority();
      const run = supervisor.snapshot;
      const { reply } = await supervisor.plan(
        provider,
        mappings,
        observations,
        inputs,
        [...seen],
      );
      const proposal = unpackProposal(reply.proposal);
      const hash = hypothesisHash(proposal.journey);
      const useful = !seen.has(hash);
      await supervisor.planningResult(useful);
      if (!useful) continue;
      seen.add(hash);
      // Keep definitions immutable; each executed journey has a fresh storage identity.
      const journey = { ...proposal.journey, id: randomUUID() };
      const predicate = run.predicates.find(
        (p) =>
          p.id === journey.predicateRef.id &&
          p.version === journey.predicateRef.version &&
          p.canonicalHash === journey.predicateRef.hash,
      );
      if (!predicate) throw new Error('MODEL PLAN ERROR');
      const trial = await establishFreshState(
        supervisor,
        run,
        journey,
        'EXPLORATION',
        inputs,
      );
      try {
        await executeJourney(supervisor, run, journey, trial);
        supervisor.assertTrial(trial.id, trial.baseline.id);
        const trace = await supervisor.repository.trace(run.projectId, run.id);
        const current = trace.observations.filter(
          (o) =>
            o.trialId === trial.id &&
            journey.steps.some((s) => s.id === o.stepId),
        );
        const outcome = evaluatePredicate(
          validatePredicate(predicate),
          trial.values,
        );
        const evidence = await saveEvidence(
          supervisor.client,
          {
            id: randomUUID(),
            runId: run.id,
            trialId: trial.id,
            phase: 'EXPLORATION',
            predicateRef: journey.predicateRef,
            baselineEvidenceId: trial.baseline.id,
            observationIds: current.map((o) => o.id),
            outcome,
            symbolicOperands: trial.values.vault.sanitize(
              {
                applicability: predicate.applicability,
                assertions: predicate.assertions,
                executionOrder: journey.steps.map((s) => ({
                  stepId: s.id,
                  ordinal: trial.values.results.get(s.id)?.ordinal ?? null,
                  operationId:
                    trial.values.results.get(s.id)?.operationId ?? null,
                })),
              },
              true,
            ),
          },
          trial.values.vault,
        );
        const candidate = await supervisor.repository.initialCandidate(
          run,
          journey,
          evidence,
          trial.baseline,
          current,
          trial.values.vault,
        );
        trials.push(evidence);
        // Return through the finally block to discard discovery values before
        // handing the still-active supervisor to independent verification.
        if (
          stopOnCandidate &&
          candidate?.classification === 'OBSERVED VIOLATION'
        )
          return { stopReason: 'OBSERVED VIOLATION', trials, candidate };
        mappings = [
          ...mappings,
          ...proposal.mappings,
          ...inferredMappings(journey),
          ...observedMappings(journey, current),
        ];
        // Recent sanitized feedback only; full immutable traces remain in PostgreSQL.
        observations = [...observations, ...current].slice(-10).map((o) =>
          Buffer.byteLength(JSON.stringify(o.result.sanitizedResponse)) <= 16384
            ? o
            : {
                ...o,
                result: {
                  ...o.result,
                  sanitizedResponse: { withheld: 'MODEL CONTEXT LIMIT' },
                  truncated: true,
                },
              },
        );
      } finally {
        if (!supervisor.stopReason) supervisor.finishTrial();
      }
    }
  } catch (error) {
    const message =
      supervisor.stopReason ??
      (error instanceof Error ? error.message : 'EXECUTION ERROR');
    const reason = [
      'MODEL ERROR',
      'MODEL PLAN ERROR',
      'BUDGET EXHAUSTED',
      'TIME EXHAUSTED',
      'JOURNEY LIMIT',
      'STAGNATION',
      'CANCELLED',
      'BASELINE ERROR',
      'EXECUTION ERROR',
      'STORAGE ERROR',
      'OWNERSHIP LOST',
      'WORKER ERROR',
      'SHUTDOWN',
    ].includes(message)
      ? message
      : 'EXECUTION ERROR';
    await supervisor.stop(reason);
    return { stopReason: supervisor.stopReason ?? reason, trials };
  }
}
