import { unpackProposal } from '../engine/mapping/state';
import { canonical } from '../engine/detection/predicate';
import { buildPlanningContext } from '../engine/planning/context';
import {
  requestProposal,
  PlanningError,
  type ReasoningProvider,
  type ProposalTelemetry,
} from '../engine/planning/provider';
import type { Json, Observation, StateMapping } from '../engine/contracts';
import { validateFrozenScope } from '../engine/policy/scope';
import { saveJourney } from './repositories/journeys';
import type { CredentialStore } from './credential-store';
import { sanitizeDocument } from '../engine/openapi/sanitize';
import { validateJourney } from '../engine/validation/journey';
import type { PoolClient } from 'pg';
import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { type JourneyStep, type Phase } from '../engine/contracts';
import { SecretVault } from '../engine/secrets/vault';
import { evaluatePredicate } from '../engine/detection/predicate';
import { validatePredicate } from '../engine/validation/predicate';
import {
  BaselineEvidenceSchema,
  type BaselineEvidence,
} from '../engine/contracts';
import { extract, type StepValue } from '../engine/execution/variables';
import { dispatch } from './dispatch';
import { BudgetManager } from '../engine/budget/manager';
import { RunSchema, type Run } from '../engine/contracts';
import { RunRepository } from './repositories/runs';
export const supervisorLockId = 4420517;
export class RunSupervisor {
  readonly repository: RunRepository;
  readonly signal: AbortSignal;
  readonly #controller = new AbortController();
  #trialId: string | undefined;
  #journey: import('../engine/contracts').Journey | undefined;
  #baselineId: string | undefined;
  #journeyPersisted = false;
  #journeyOrdinal = 0;
  #trialPhase: Exclude<Phase, 'RESET' | 'BASELINE'> = 'EXPLORATION';
  #queue: { step: JourneyStep; phase: Phase }[] = [];
  #ordinal = 0;
  #baseline = false;
  #setupFailureRecorded = false;
  #setupEvaluations: import('../engine/contracts').Json[] = [];
  #planning = false;
  #planningDone: Promise<void> = Promise.resolve();
  #dispatching = false;
  #dispatchDone: Promise<void> = Promise.resolve();
  #vault = new SecretVault();
  #results = new Map<string, StepValue>();
  #credentials = new Map<string, string>();
  #worker: Worker | undefined;
  #watchdog: NodeJS.Timeout | undefined;
  #reason: string | undefined;
  #owns = true;
  #run: Run | undefined;
  #budget: BudgetManager | undefined;
  readonly #lost = () => this.closeGate('OWNERSHIP LOST');
  private constructor(
    readonly client: PoolClient,
    readonly credentialStore?: CredentialStore,
  ) {
    this.repository = new RunRepository(client);
    this.signal = this.#controller.signal;
    client.on('error', this.#lost);
    client.on('end', this.#lost);
  }
  static async acquire(client: PoolClient, credentialStore?: CredentialStore) {
    const result = await client.query<{ owned: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS owned',
      [supervisorLockId],
    );
    if (!result.rows[0]?.owned) throw new Error('SUPERVISOR BUSY');
    const owner = new RunSupervisor(client, credentialStore);
    try {
      await owner.repository.recoverInterrupted();
      return owner;
    } catch {
      await owner.shutdown();
      throw new Error('STORAGE ERROR');
    }
  }
  assertAuthority() {
    if (this.#reason) throw new Error(this.#reason);
    if (!this.#owns) throw new Error('OWNERSHIP LOST');
    this.#budget?.check();
  }
  closeGate(reason: string) {
    this.#reason ??= reason;
    this.#budget?.stop(this.#reason);
    this.#controller.abort();
    clearTimeout(this.#watchdog);
    void this.#worker?.terminate();
  }
  get stopReason() {
    return this.#reason;
  }
  get admittedJourney() {
    if (!this.#journey) throw new Error('TRIAL NOT ADMITTED');
    return structuredClone(this.#journey);
  }
  assertTrial(trialId: string, baselineId: string) {
    this.assertAuthority();
    if (
      trialId !== this.#trialId ||
      !this.#baseline ||
      baselineId !== this.#baselineId
    )
      throw new Error('BASELINE NOT VERIFIED');
  }
  get trialControls() {
    if (!this.#run || !this.#trialId) throw new Error('TRIAL NOT ADMITTED');
    return { runId: this.#run.id, reset: structuredClone(this.#run.reset) };
  }
  async stop(reason: string) {
    this.closeGate(reason);
    await this.#dispatchDone;
    await this.#planningDone;
    try {
      if (this.#run) {
        try {
          if (this.#trialId && !this.#baseline && !this.#setupFailureRecorded) {
            this.#setupFailureRecorded = true;
            await this.repository.setupFailure(
              this.#run.id,
              this.#trialId,
              [...this.#results.keys()],
              {
                reason: this.#reason ?? reason,
                assertions: this.#setupEvaluations,
              },
            );
          }
        } finally {
          await this.repository.stop(this.#run.id, this.#reason ?? reason);
        }
      }
    } finally {
      this.#discardTransient();
    }
  }
  async invalidateTrial() {
    this.#setupEvaluations.push({
      phase: 'BASELINE',
      outcome: 'UNEVALUABLE',
      reason: 'KNOWN EXTERNAL INTERFERENCE',
    });
    this.#baseline = false;
    await this.stop('BASELINE ERROR');
  }
  cancel() {
    this.closeGate('CANCELLED');
  }
  async accept(input: Run) {
    this.assertAuthority();
    if (this.#run) throw new Error('RUN BUSY');
    const parsed = RunSchema.parse(input);
    validateFrozenScope(parsed.scope);
    for (const predicate of [
      ...parsed.predicates,
      ...parsed.reset.resetAssertions.map((a) => a.predicate),
      ...parsed.reset.baselineAssertions.map((a) => a.predicate),
    ])
      validatePredicate(predicate);
    if (
      !parsed.apiSnapshot.operations.some(
        (o) =>
          o.eligible &&
          parsed.scope.operationPolicy.some(
            (p) => p.operationId === o.id && p.category === 'EXPLORATION',
          ),
      )
    )
      throw new Error('NO ELIGIBLE OPERATIONS');
    for (const binding of parsed.credentialBindings) {
      if (!this.credentialStore) throw new Error('CREDENTIAL UNAVAILABLE');
      const secret = await this.credentialStore.resolve({
        projectId: parsed.projectId,
        slot: binding.slot,
        version: binding.version,
      });
      this.#credentials.set(binding.slot, secret);
      this.#vault.register(secret);
    }
    if (
      JSON.stringify(
        sanitizeDocument(
          {
            ...parsed,
            modelConfiguration: this.#vault.sanitize(parsed.modelConfiguration),
          } as unknown as import('../engine/contracts').Json,
          this.#vault,
          true,
        ),
      ) !== JSON.stringify(parsed)
    )
      throw new Error('SECRET IN RUN SNAPSHOT');
    this.#budget = new BudgetManager(parsed.budget.limits);
    const run = RunSchema.parse({
      ...parsed,
      status: 'ACCEPTED',
      budget: this.#budget.snapshot(),
    });
    try {
      await this.repository.create(run);
      this.assertAuthority();
      this.#run = structuredClone(run);
      this.#worker = new Worker(resolve('dist/engine-worker.mjs'), {
        resourceLimits: { maxOldGenerationSizeMb: 128 },
      });
      this.#worker.on('error', () => this.closeGate('WORKER ERROR'));
      this.#watchdog = setTimeout(
        () => this.closeGate('TIME EXHAUSTED'),
        this.#budget.remainingMilliseconds(),
      );
      this.#watchdog.unref();
      return structuredClone(run);
    } catch {
      this.closeGate('STORAGE ERROR');
      throw new Error('STORAGE ERROR');
    }
  }
  get snapshot(): Run {
    // Read-only evidence/counters remain inspectable after cancellation or lock
    // loss. A snapshot is data, never admission or dispatch authorization.
    if (!this.#run || !this.#budget) throw new Error('RUN NOT ACCEPTED');
    return {
      ...structuredClone(this.#run),
      budget: this.#budget.snapshot(),
      ...(this.#reason ? { stopReason: this.#reason } : {}),
    };
  }
  async planningResult(useful: boolean) {
    this.assertAuthority();
    if (!this.#run || !this.#budget) throw new Error('RUN NOT ACCEPTED');
    try {
      this.#budget.planningResult(useful);
    } finally {
      await this.repository.counters(this.#run.id, this.#budget.snapshot());
    }
    this.assertAuthority();
  }
  async plan(
    provider: ReasoningProvider,
    mappings: StateMapping[],
    observations: Observation[],
    inputs: Record<string, Json>,
    hashes: string[],
  ) {
    this.assertAuthority();
    if (!this.#run || !this.#budget || this.#planning || this.#queue.length)
      throw new Error('PLANNING NOT AVAILABLE');
    this.#budget.checkExploration(
      this.#run.reset.resetSteps.length,
      this.#run.reset.checkSteps.length,
    );
    const run = this.snapshot;
    const config = run.modelConfiguration;
    if (
      !config ||
      typeof config !== 'object' ||
      Array.isArray(config) ||
      typeof config.model !== 'string' ||
      !config.model.trim()
    )
      throw new Error('MODEL ERROR');
    if (
      typeof config.provider === 'string' &&
      provider.identity?.provider !== config.provider
    )
      throw new Error('MODEL ERROR');
    const vault = new SecretVault(run.credentialBindings.map((b) => b.name));
    for (const value of this.#credentials.values()) vault.register(value);
    this.#planning = true;
    let settled = () => {};
    this.#planningDone = new Promise<void>((resolve) => {
      settled = resolve;
    });
    const roundId = randomUUID();
    try {
      let context;
      try {
        context = buildPlanningContext(
          {
            run,
            mappings,
            observations,
            symbolicInputs: inputs,
            consideredHypothesisHashes: hashes,
          },
          vault,
        );
      } catch {
        throw new Error('MODEL PLAN ERROR');
      }
      this.assertAuthority();
      this.#budget.modelCall();
      await this.repository.planning(
        run.id,
        roundId,
        'PLANNING INTENT',
        {
          context,
          provider: provider.identity?.provider ?? 'unavailable',
          model: config.model,
        } as unknown as Json,
        this.#budget.snapshot(),
      );
      this.assertAuthority();
      let telemetry: ProposalTelemetry;
      let reply;
      try {
        reply = await requestProposal({
          provider,
          context,
          api: run.apiSnapshot,
          scope: run.scope,
          model: config.model,
          signal: this.signal,
          timeoutMs: this.#budget.timeout('model'),
          remainingMilliseconds: this.#budget.remainingMilliseconds(),
        });
        telemetry = {
          provider: reply.provider,
          model: reply.model,
          attempted: true,
          usage: reply.usage,
          outcome: 'PROPOSED',
        };
      } catch (error) {
        telemetry =
          error instanceof PlanningError
            ? error.telemetry
            : {
                provider: provider.identity?.provider ?? 'unavailable',
                model: config.model,
                attempted: false,
                usage: { estimated: true },
                outcome: this.signal.aborted ? 'CANCELLED' : 'MODEL ERROR',
              };
        await this.repository.planning(
          run.id,
          roundId,
          'PLANNING RESULT',
          vault.sanitize({ telemetry } as unknown as Json, true),
          this.#budget.snapshot(),
        );
        throw new Error(this.stopReason ?? telemetry.outcome);
      }
      const safe = sanitizeDocument(
        reply as unknown as Json,
        vault,
        true,
      ) as Record<string, Json>;
      try {
        const originalProposal = unpackProposal(reply.proposal);
        const safeProposal = unpackProposal(safe.proposal);
        const { rationale: originalRationale, ...originalJourney } =
          originalProposal.journey;
        const { rationale: safeRationale, ...safeJourney } =
          safeProposal.journey;
        void originalRationale;
        void safeRationale;
        if (canonical(originalJourney) !== canonical(safeJourney))
          throw new Error('MODEL PLAN ERROR');
      } catch {
        await this.repository.planning(
          run.id,
          roundId,
          'PLANNING RESULT',
          vault.sanitize(
            {
              telemetry: { ...telemetry, outcome: 'MODEL PLAN ERROR' },
            } as unknown as Json,
            true,
          ),
          this.#budget.snapshot(),
        );
        throw new Error('MODEL PLAN ERROR');
      }
      await this.repository.planning(
        run.id,
        roundId,
        'PLANNING RESULT',
        safe,
        this.#budget.snapshot(),
      );
      this.assertAuthority();
      return { reply: { ...reply, proposal: safe.proposal }, roundId };
    } catch (error) {
      const reason =
        this.stopReason ??
        (error instanceof Error &&
        [
          'MODEL ERROR',
          'MODEL PLAN ERROR',
          'CANCELLED',
          'TIME EXHAUSTED',
          'BUDGET EXHAUSTED',
          'JOURNEY LIMIT',
        ].includes(error.message)
          ? error.message
          : 'STORAGE ERROR');
      // An intent is conservative evidence if shutdown/storage failure leaves its result unknown.
      this.closeGate(reason);
      throw new Error(reason);
    } finally {
      vault.discard();
      this.#planning = false;
      settled();
    }
  }
  admitTrial(
    journeyInput: unknown,
    phase: Exclude<Phase, 'RESET' | 'BASELINE'>,
  ) {
    this.assertAuthority();
    if (!['EXPLORATION', 'REPLAY', 'MINIMIZATION', 'ARTIFACT'].includes(phase))
      throw new Error('INVALID TRIAL PHASE');
    if (!this.#run || !this.#budget || this.#queue.length || this.#planning)
      throw new Error('TRIAL NOT AVAILABLE');
    const journey = validateJourney(
      journeyInput,
      this.#run.apiSnapshot,
      this.#run.scope,
      phase,
    );
    const setupIds = [
      ...this.#run.reset.resetSteps,
      ...this.#run.reset.checkSteps,
      ...journey.steps,
    ].map((step) => step.id);
    if (new Set(setupIds).size !== setupIds.length)
      throw new Error('DUPLICATE TRIAL STEP');
    this.#budget.admitTrial(
      this.#run.reset.resetSteps.length,
      this.#run.reset.checkSteps.length,
      journey.steps.length,
      phase,
    );
    this.#results.clear();
    this.#journey = structuredClone(journey);
    this.#journeyPersisted = false;
    this.#trialPhase = phase;
    this.#baselineId = undefined;
    this.#trialId = randomUUID();
    this.#baseline = false;
    this.#ordinal = 0;
    this.#setupFailureRecorded = false;
    this.#setupEvaluations = [];
    this.#vault.discard();
    this.#vault = new SecretVault(
      this.#run.credentialBindings.map((b) => b.name),
    );
    for (const secret of this.#credentials.values())
      this.#vault.register(secret);
    this.#queue = [
      ...this.#run.reset.resetSteps.map((step) => ({
        step,
        phase: 'RESET' as const,
      })),
      ...this.#run.reset.checkSteps.map((step) => ({
        step,
        phase: 'BASELINE' as const,
      })),
      ...journey.steps.map((step) => ({ step, phase })),
    ];
    return this.#trialId;
  }
  get trialVault() {
    return this.#vault;
  }
  #evaluateSetup(
    assertions: Run['reset']['baselineAssertions'],
    phase: 'RESET' | 'BASELINE',
  ) {
    for (const assertion of assertions) {
      let outcome: 'SATISFIED' | 'VIOLATED' | 'NOT APPLICABLE' | 'UNEVALUABLE' =
        'UNEVALUABLE';
      try {
        outcome = evaluatePredicate(validatePredicate(assertion.predicate), {
          vault: this.#vault,
          results: this.#results,
          inputs: {},
        });
      } catch {
        /* Invalid assertion evidence fails closed. */
      }
      this.#setupEvaluations.push({
        assertionId: assertion.id,
        phase,
        predicateRef: {
          id: assertion.predicate.id,
          version: assertion.predicate.version,
          hash: assertion.predicate.canonicalHash,
        },
        outcome,
      });
      if (outcome !== 'SATISFIED') throw new Error('BASELINE ERROR');
    }
  }
  async establishBaseline(): Promise<BaselineEvidence> {
    this.assertAuthority();
    if (
      !this.#run ||
      !this.#trialId ||
      this.#baseline ||
      this.#queue[0]?.phase === 'RESET' ||
      this.#queue[0]?.phase === 'BASELINE'
    )
      throw new Error('BASELINE INCOMPLETE');
    try {
      this.#evaluateSetup(this.#run.reset.baselineAssertions, 'BASELINE');
      const baseline = BaselineEvidenceSchema.parse({
        id: randomUUID(),
        runId: this.#run.id,
        trialId: this.#trialId,
        resetStepIds: this.#run.reset.resetSteps.map((s) => s.id),
        checkStepIds: this.#run.reset.checkSteps.map((s) => s.id),
        verdict: 'SATISFIED',
        assertionIds: this.#run.reset.baselineAssertions.map((a) => a.id),
      });
      await this.repository.baseline(baseline);
      this.assertAuthority();
      this.#baseline = true;
      this.#baselineId = baseline.id;
      return baseline;
    } catch {
      this.closeGate('BASELINE ERROR');
      throw new Error('BASELINE ERROR');
    }
  }
  finishTrial() {
    this.assertAuthority();
    if (this.#queue.length) throw new Error('TRIAL INCOMPLETE');
    this.#vault.discard();
    this.#results.clear();
    this.#trialId = undefined;
    this.#baseline = false;
  }
  async dispatchIntent(input: unknown) {
    this.assertAuthority();
    if (this.#dispatching) throw new Error('DISPATCH BUSY');
    const current = this.#queue[0];
    const run = this.#run,
      budget = this.#budget,
      trialId = this.#trialId;
    if (!current || !run || !budget || !trialId)
      throw new Error('TRIAL NOT ADMITTED');
    if (
      current.phase !== 'RESET' &&
      current.phase !== 'BASELINE' &&
      !this.#baseline
    )
      throw new Error('BASELINE NOT VERIFIED');
    this.#dispatching = true;
    let settled = () => {};
    this.#dispatchDone = new Promise<void>((resolve) => {
      settled = resolve;
    });
    try {
      if (!this.#journeyPersisted) {
        try {
          await saveJourney(
            this.client,
            run.id,
            this.#trialPhase,
            { ...this.#journey, id: this.#journey!.id },
            this.#journeyOrdinal++,
            this.#vault,
          );
        } catch {
          throw new Error('STORAGE ERROR');
        }
        this.assertAuthority();
        this.#journeyPersisted = true;
      }
      return await dispatch(
        {
          run,
          budget,
          vault: this.#vault,
          repository: this.repository,
          trialId,
          phase: current.phase,
          step: current.step,
          journeyId: this.#journey!.id,
          ordinal: this.#ordinal,
          signal: this.signal,
          credentials: this.#credentials,
          assert: () => this.assertAuthority(),
          advance: (result) => {
            this.#results.set(current.step.id, result);
            this.#queue.shift();
            this.#ordinal++;
            if (current.phase === 'RESET' || current.phase === 'BASELINE') {
              if (
                !current.step.expectedStatuses.includes(result.status) ||
                result.truncated
              )
                throw new Error('BASELINE ERROR');
              for (const variable of current.step.extracts)
                extract(variable, {
                  vault: this.#vault,
                  results: this.#results,
                  inputs: {},
                });
              if (
                current.phase === 'RESET' &&
                this.#queue[0]?.phase !== 'RESET'
              ) {
                this.#evaluateSetup(run.reset.resetAssertions, 'RESET');
              }
            }
          },
        },
        input,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'EXECUTION ERROR';
      const preserved = [
        'CANCELLED',
        'BUDGET EXHAUSTED',
        'TIME EXHAUSTED',
        'OWNERSHIP LOST',
        'STORAGE ERROR',
      ];
      const control = current.phase === 'RESET' || current.phase === 'BASELINE';
      const reason = preserved.includes(message)
        ? message
        : control
          ? 'BASELINE ERROR'
          : 'EXECUTION ERROR';
      this.closeGate(reason);
      throw new Error(control ? (this.#reason ?? reason) : message);
    } finally {
      this.#dispatching = false;
      settled();
    }
  }
  #discardTransient() {
    this.#vault.discard();
    this.#credentials.clear();
    this.#results.clear();
    this.#queue = [];
    this.#journey = undefined;
    this.#trialId = undefined;
    this.#baselineId = undefined;
    this.#baseline = false;
  }
  async shutdown() {
    this.closeGate('SHUTDOWN');
    await this.#dispatchDone;
    await this.#planningDone;
    if (this.#run) {
      try {
        await this.repository.stop(
          this.#run.id,
          this.#reason ?? 'SHUTDOWN',
          'INTERRUPTED',
        );
      } catch {
        /* Startup recovery retains uncertain intent. */
      }
    }
    if (this.#owns) {
      this.#owns = false;
      try {
        await this.client.query('SELECT pg_advisory_unlock($1)', [
          supervisorLockId,
        ]);
      } catch {
        /* A lost connection releases its PostgreSQL lock. */
      }
    }
    this.#discardTransient();
    this.client.off('error', this.#lost);
    this.client.off('end', this.#lost);
  }
}
