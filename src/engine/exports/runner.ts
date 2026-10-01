import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  JsonSchema,
  FrozenScopeSchema,
  Hash,
  type JourneyStep,
  type Phase,
} from '../contracts';
import { BudgetManager } from '../budget/manager';
import { approveScope, assertUrl, authorizeOperation } from '../policy/scope';
import { validateJourney } from '../validation/journey';
import { validatePredicate } from '../validation/predicate';
import { canonical, evaluatePredicate } from '../detection/predicate';
import { createPinnedHttpTransport } from '../../transport/http';
import { prepareRequest } from '../execution/prepare';
import { requestInput } from '../execution/requests';
import { extract, type ValueContext } from '../execution/variables';
import { responseExecutionError } from '../execution/response-policy';
import { SecretVault } from '../secrets/vault';
import { ManifestSchema, type Manifest } from './contracts';
import { manifestHash } from './manifest-integrity';
import { assertionEvaluations } from './assertions';
import { assertExecutableSecretFree } from './secret-free';

export const InvocationSchema = z.strictObject({
  target: z.string().min(1),
  addresses: FrozenScopeSchema.shape.addresses,
  approvedOperations: z.array(z.string().min(1)).min(1),
  mutationsAcknowledged: z.boolean(),
  budget: z.strictObject({
    requests: z.int().positive().max(100000),
    milliseconds: z.int().positive().max(86400000),
    requestTimeoutMs: z.int().positive().max(30000),
  }),
  credentials: z.record(z.string(), z.string().min(1)),
  inputs: z.record(z.string(), JsonSchema),
});
export type Invocation = z.infer<typeof InvocationSchema>;
export function requiredOperations(m: Manifest): string[] {
  return [
    ...new Set(
      [...m.reset.resetSteps, ...m.reset.checkSteps, ...m.journey.steps].map(
        (s) => s.operationId,
      ),
    ),
  ];
}
export function exactManifest(value: unknown, expectedHash: string) {
  Hash.parse(expectedHash);
  const m = ManifestSchema.parse(value);
  JSON.parse(canonical(m)); // Optional undefined values are not executable JSON.
  if (manifestHash(m) !== expectedHash)
    throw new Error('MANIFEST INTEGRITY ERROR');
  return m;
}
// Independent invocation only: no originating supervisor, repository, capability,
// counters or status commit. Only authority-neutral pinned HTTP mechanics are shared.
export async function runRegression(
  value: unknown,
  expectedHash: string,
  invocation: unknown,
  signal: AbortSignal = new AbortController().signal,
) {
  const vault = new SecretVault();
  let budget: BudgetManager | undefined;
  const trialId = randomUUID();
  let baseline:
    { id: string; trialId: string; outcome: 'SATISFIED' } | undefined;
  let stage: 'PREFLIGHT' | 'RESET' | 'BASELINE' | 'JOURNEY' | 'ASSERTION' =
    'PREFLIGHT';
  const steps: {
    stepId: string;
    phase: Phase;
    status: number;
    truncated: boolean;
  }[] = [];
  try {
    const m = exactManifest(value, expectedHash),
      i = InvocationSchema.parse(invocation);
    const required = requiredOperations(m);
    if (
      new Set(i.approvedOperations).size !== i.approvedOperations.length ||
      canonical([...i.approvedOperations].sort()) !==
        canonical([...required].sort())
    )
      throw new Error('OPERATION APPROVAL REQUIRED');
    if (
      canonical(Object.keys(i.credentials).sort()) !==
      canonical([...m.credentialSlots].sort())
    )
      throw new Error('CREDENTIAL UNAVAILABLE');
    const credentials = new Map(Object.entries(i.credentials));
    for (const secret of credentials.values()) {
      vault.register(secret);
      vault.register('Bearer ' + secret);
    }
    assertExecutableSecretFree(
      m,
      [
        m.journey,
        { ...m.journey, steps: [...m.reset.resetSteps, ...m.reset.checkSteps] },
      ],
      [
        m.predicate,
        ...m.reset.resetAssertions.map((a) => a.predicate),
        ...m.reset.baselineAssertions.map((a) => a.predicate),
      ],
      vault,
    );
    const policy = required.map((id) => {
      const p = m.scopeTemplate.operationPolicy.find(
        (p) => p.operationId === id,
      );
      const operation = m.apiModel.operations.find((o) => o.id === id);
      if (
        !p ||
        !operation?.eligible ||
        id !== `${operation.method} ${operation.pathTemplate}` ||
        !m.scopeTemplate.operationIds.includes(id)
      )
        throw new Error('OPERATION EXPECTATION ERROR');
      if (
        !['GET', 'HEAD', 'OPTIONS'].includes(operation.method) &&
        !i.mutationsAcknowledged
      )
        throw new Error('MUTATION ACKNOWLEDGMENT REQUIRED');
      return structuredClone(p);
    });
    const scope = approveScope(
      i.target,
      i.addresses,
      policy,
      i.mutationsAcknowledged,
      randomUUID(),
    );
    if (
      canonical(scope.basePathSegments) !==
      canonical(m.scopeTemplate.basePathSegments)
    )
      throw new Error('TARGET PATH MISMATCH');
    for (const id of required) {
      const operation = m.apiModel.operations.find((o) => o.id === id)!;
      assertUrl(scope, new URL(operation.pathTemplate, scope.origin).href);
    }
    validateJourney(m.journey, m.apiModel, scope, 'ARTIFACT');
    const allSteps = [
      ...m.reset.resetSteps,
      ...m.reset.checkSteps,
      ...m.journey.steps,
    ];
    if (new Set(allSteps.map((s) => s.id)).size !== allSteps.length)
      throw new Error('STEP IDENTITY ERROR');
    for (const [steps, phase] of [
      [m.reset.resetSteps, 'RESET'],
      [m.reset.checkSteps, 'BASELINE'],
    ] as const) {
      for (const s of steps) authorizeOperation(scope, s.operationId, phase);
    }
    budget = new BudgetManager({
      ...i.budget,
      steps: 10,
      journeys: 1,
      modelTimeoutMs: 1,
    });
    const check = () => {
      if (signal.aborted) throw new Error('CANCELLED');
      budget!.check();
    };
    check();
    budget.admitTrial(
      m.reset.resetSteps.length,
      m.reset.checkSteps.length,
      m.journey.steps.length,
      'ARTIFACT',
    );
    const values: ValueContext = {
      vault,
      results: new Map(),
      inputs: i.inputs,
    };
    for (const v of m.journey.variables) extract(v, values);
    const execute = createPinnedHttpTransport();
    const dispatch = async (
      step: JourneyStep,
      phase: Phase,
      ordinal: number,
    ) => {
      check();
      const input = requestInput(step, values);
      const prepared = prepareRequest(
        m.apiModel,
        scope,
        phase,
        step,
        input,
        m.credentialBindings,
        credentials,
      );
      check();
      authorizeOperation(scope, step.operationId, phase);
      assertUrl(scope, prepared.url.href);
      const timeoutMs = budget!.timeout('request');
      budget!.consume(phase);
      const r = await execute({
        url: prepared.url,
        address: scope.addresses[0]!,
        method: prepared.operation.method,
        headers: prepared.headers,
        body: prepared.input.body,
        signal,
        timeoutMs,
      });
      check();
      steps.push({
        stepId: step.id,
        phase,
        status: r.status,
        truncated: r.truncated,
      });
      if (
        (phase === 'RESET' || phase === 'BASELINE') &&
        !step.expectedStatuses.includes(r.status)
      )
        throw new Error('BASELINE ERROR');
      if (
        phase === 'ARTIFACT' &&
        responseExecutionError(r.status, step.expectedStatuses)
      )
        throw new Error('EXECUTION ERROR');
      values.results.set(step.id, {
        ...r,
        ordinal,
        operationId: step.operationId,
        request: input,
      });
      for (const v of step.extracts) extract(v, values);
    };
    const assertions = (list: Manifest['reset']['baselineAssertions']) => {
      for (const a of list)
        if (
          evaluatePredicate(validatePredicate(a.predicate), values) !==
          'SATISFIED'
        )
          throw new Error('BASELINE ERROR');
    };
    stage = 'RESET';
    for (const [n, s] of m.reset.resetSteps.entries())
      await dispatch(s, 'RESET', n);
    assertions(m.reset.resetAssertions);
    stage = 'BASELINE';
    for (const [n, s] of m.reset.checkSteps.entries())
      await dispatch(s, 'BASELINE', n);
    assertions(m.reset.baselineAssertions);
    baseline = { id: randomUUID(), trialId, outcome: 'SATISFIED' };
    stage = 'JOURNEY';
    for (const [n, s] of m.journey.steps.entries())
      await dispatch(s, 'ARTIFACT', n);
    stage = 'ASSERTION';
    check();
    const verdict = evaluatePredicate(m.predicate, values),
      evaluations = assertionEvaluations(m.predicate, values);
    return {
      context: 'INDEPENDENT' as const,
      trialId,
      manifestHash: expectedHash,
      predicateRef: m.predicateRef,
      result:
        verdict === 'VIOLATED'
          ? ('FAIL' as const)
          : verdict === 'SATISFIED'
            ? ('PASS' as const)
            : ('INCONCLUSIVE' as const),
      verdict,
      evaluations,
      baseline,
      steps,
      usedRequests: budget.snapshot().usedRequests,
    };
  } catch (error) {
    let message = error instanceof Error ? error.message : '';
    try {
      budget?.check();
    } catch {
      message = 'TIME EXHAUSTED';
    }
    const reasons = [
      'MANIFEST INTEGRITY ERROR',
      'OPERATION APPROVAL REQUIRED',
      'CREDENTIAL UNAVAILABLE',
      'OPERATION EXPECTATION ERROR',
      'MUTATION ACKNOWLEDGMENT REQUIRED',
      'TARGET PATH MISMATCH',
      'STEP IDENTITY ERROR',
      'CANCELLED',
      'BUDGET EXHAUSTED',
      'TIME EXHAUSTED',
      'BASELINE ERROR',
    ];
    const reason = signal.aborted
      ? 'CANCELLED'
      : reasons.includes(message)
        ? message
        : stage === 'PREFLIGHT'
          ? 'INVALID INVOCATION OR MANIFEST'
          : stage === 'RESET' || stage === 'BASELINE'
            ? 'BASELINE ERROR'
            : 'EXECUTION ERROR';
    return {
      context: 'INDEPENDENT' as const,
      trialId,
      result: 'ERROR' as const,
      reason,
      stage,
      baseline,
      steps,
      usedRequests: budget?.snapshot().usedRequests ?? 0,
    };
  } finally {
    vault.discard();
  }
}
