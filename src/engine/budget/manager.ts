import { performance } from 'node:perf_hooks';
import {
  BudgetLimitsSchema,
  type BudgetLimits,
  type Phase,
  type RunBudget,
} from '../contracts';
export const defaultLimits: Readonly<BudgetLimits> = Object.freeze({
  requests: 200,
  milliseconds: 600000,
  journeys: 20,
  steps: 10,
  requestTimeoutMs: 10000,
  modelTimeoutMs: 30000,
});
export class BudgetManager {
  readonly limits: Readonly<BudgetLimits>;
  readonly #clock: () => number;
  readonly #deadline: number;
  readonly #acceptedAt = new Date().toISOString();
  #used = 0;
  #journeys = 0;
  #modelCalls = 0;
  #stagnant = 0;
  #stopped: string | undefined;
  readonly #phases: Record<Phase, number> = {
    RESET: 0,
    BASELINE: 0,
    EXPLORATION: 0,
    REPLAY: 0,
    MINIMIZATION: 0,
    ARTIFACT: 0,
  };
  constructor(
    limits: BudgetLimits = defaultLimits,
    clock = () => performance.now(),
  ) {
    this.limits = Object.freeze(BudgetLimitsSchema.parse(limits));
    this.#clock = clock;
    this.#deadline = clock() + limits.milliseconds;
  }
  check() {
    if (this.#stopped) throw new Error(this.#stopped);
    if (this.#clock() >= this.#deadline) throw new Error('TIME EXHAUSTED');
  }
  stop(reason: string) {
    this.#stopped ??= reason;
  }
  admitTrial(reset: number, checks: number, steps: number, phase: Phase) {
    this.check();
    if (
      ![reset, checks, steps].every(Number.isInteger) ||
      reset < 1 ||
      reset > 10 ||
      checks < 0 ||
      checks > 10 ||
      steps < 1 ||
      steps > this.limits.steps
    )
      throw new Error('INVALID TRIAL');
    if (this.#used + reset + checks + steps > this.limits.requests)
      throw new Error('BUDGET EXHAUSTED');
    if (phase === 'EXPLORATION') {
      if (this.#journeys >= this.limits.journeys)
        throw new Error('JOURNEY LIMIT');
      this.#journeys++;
    }
  }
  consume(phase: Phase) {
    this.check();
    if (this.#used >= this.limits.requests) throw new Error('BUDGET EXHAUSTED');
    this.#used++;
    this.#phases[phase]++;
  }
  remainingMilliseconds() {
    this.check();
    return this.#deadline - this.#clock();
  }
  timeout(kind: 'request' | 'model') {
    this.check();
    return Math.min(
      kind === 'request'
        ? this.limits.requestTimeoutMs
        : this.limits.modelTimeoutMs,
      this.#deadline - this.#clock(),
    );
  }
  checkExploration(reset: number, checks: number) {
    this.check();
    if (this.#journeys >= this.limits.journeys)
      throw new Error('JOURNEY LIMIT');
    if (this.#used + reset + checks + 1 > this.limits.requests)
      throw new Error('BUDGET EXHAUSTED');
  }
  modelCall() {
    this.check();
    this.#modelCalls++;
  }
  planningResult(useful: boolean) {
    this.check();
    this.#stagnant = useful ? 0 : this.#stagnant + 1;
    if (this.#stagnant >= 3) throw new Error('STAGNATION');
  }
  snapshot(): RunBudget {
    return {
      limits: { ...this.limits },
      usedRequests: this.#used,
      requestsByPhase: { ...this.#phases },
      usedExplorationJourneys: this.#journeys,
      modelCalls: this.#modelCalls,
      stagnantRounds: this.#stagnant,
      acceptedAt: this.#acceptedAt,
      deadlineAt: new Date(
        Date.parse(this.#acceptedAt) + this.limits.milliseconds,
      ).toISOString(),
    };
  }
}
