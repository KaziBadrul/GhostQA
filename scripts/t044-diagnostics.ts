import { z } from 'zod';
import {
  ProviderDiagnosticSchema,
  ProposalFailureKindSchema,
} from '../src/engine/planning/provider';
const outcome = z.enum([
  'VIOLATED',
  'SATISFIED',
  'NOT APPLICABLE',
  'UNEVALUABLE',
]);
const classification = z.enum([
  'OBSERVED VIOLATION',
  'CONFIRMED',
  'NON-REPRODUCED',
  'INCONCLUSIVE',
]);
const safeModel = z.string().regex(/^(?:models\/)?[A-Za-z0-9._-]+$/);
const reasons = new Set([
  'TEST DATABASE REQUIRED',
  'DISCOVERY OR CONFIRMATION INCOMPLETE',
  'REPRODUCTION INCOMPLETE',
  'IDENTITY MISMATCH',
  'FRESHNESS FAILURE',
  'FRESH RUNTIME VALUES FAILURE',
  'BUDGET DISCONTINUITY',
  'BUDGET OR MODEL PROVENANCE FAILURE',
  'PACKAGE IDENTITY OR ISOLATION FAILURE',
  'HISTORICAL EVIDENCE CHANGED',
  'SANITIZATION FAILURE',
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
  'SUPERVISOR BUSY',
  'SCOPE APPROVAL REQUIRED',
  'REPRODUCTION IDENTITY MISMATCH',
  'BUNDLE ISOLATION ERROR',
  'REPRODUCTION COMPLETE',
  'DISCOVERY COMPLETE',
  'VERIFICATION COMPLETE',
  'OBSERVED VIOLATION',
]);
export function safeReason(value: unknown) {
  const text = value instanceof Error ? value.message : value;
  return typeof text === 'string' && reasons.has(text)
    ? text
    : 'UNCLASSIFIED ERROR; RAW DETAILS WITHHELD';
}
export class GateDiagnostics {
  stage = 'CONFIGURATION';
  lastCompletedStage: string | undefined;
  details: Record<string, string | number | boolean> = {};
  providerDiagnostic?: z.infer<typeof ProviderDiagnosticSchema>;
  supervisorOwnership?: ReturnType<typeof projectSupervisorOwnership>;
  progress = (stage: string, completed: boolean) => {
    if (completed) this.lastCompletedStage = stage;
    else this.stage = stage;
  };
  configured(model: string) {
    this.details.provider = 'gemini';
    const parsed = safeModel.safeParse(model);
    if (parsed.success) this.details.model = parsed.data;
  }
  observe(value: unknown) {
    const parsed = z
      .object({
        stopReason: z.string(),
        candidate: z.object({ classification }).optional(),
        verification: z
          .object({ finding: z.object({ classification }) })
          .optional(),
        reproduction: z
          .object({
            minimization: z.object({
              originalLength: z.int().nonnegative(),
              bestLength: z.int().nonnegative(),
            }),
            supervised: z.object({
              artifact: z.object({
                verification: z.enum(['UNVERIFIED', 'VERIFIED']),
              }),
              evidence: z.object({ outcome }).optional(),
            }),
            finalBudget: z.object({
              usedRequests: z.int().nonnegative(),
              limits: z.object({ requests: z.int().nonnegative() }),
            }),
          })
          .optional(),
      })
      .safeParse(value);
    if (!parsed.success) return;
    const r = parsed.data;
    this.details.stopReason = safeReason(r.stopReason);
    if (r.candidate) this.details.discoveryStatus = r.candidate.classification;
    if (r.verification)
      this.details.confirmationStatus = r.verification.finding.classification;
    if (r.reproduction) {
      const p = r.reproduction;
      Object.assign(this.details, {
        originalJourneyLength: p.minimization.originalLength,
        bestVerifiedJourneyLength: p.minimization.bestLength,
        artifactStatus: p.supervised.artifact.verification,
        requestBudgetUsed: p.finalBudget.usedRequests,
        requestBudgetLimit: p.finalBudget.limits.requests,
      });
      if (p.supervised.evidence)
        this.details.supervisedVerificationStatus =
          p.supervised.evidence.outcome;
      if (p.supervised.artifact.verification !== 'VERIFIED') {
        this.stage = 'SUPERVISED_VERIFICATION';
        this.lastCompletedStage = 'MANIFEST_GENERATION';
      }
    } else if (r.candidate) this.stage = 'CONFIRMATION';
    else this.stage = 'DISCOVERY';
  }
  failure(error: unknown) {
    return {
      task: 'T044',
      result: 'FAIL',
      failedStage: this.stage,
      reason: safeReason(error),
      ...(this.lastCompletedStage
        ? { lastCompletedStage: this.lastCompletedStage }
        : {}),
      ...this.details,
      ...(this.supervisorOwnership
        ? { supervisorOwnership: this.supervisorOwnership }
        : {}),
      ...(this.providerDiagnostic
        ? { providerDiagnostic: this.providerDiagnostic }
        : {}),
    };
  }
}
// Explicit projections: no context, proposals, response bodies, headers or raw errors.
export function projectDurableDiagnostics(
  runRows: unknown[],
  evidenceRows: unknown[],
  stepRows: unknown[],
  findingRows: unknown[] = [],
  journeyRows: unknown[] = [],
) {
  const run = z
    .object({
      id: z.uuid(),
      stop_reason: z.string().nullable(),
      counters: z.object({
        usedRequests: z.int().nonnegative(),
        modelCalls: z.int().nonnegative().optional(),
        limits: z.object({ requests: z.int().nonnegative() }),
      }),
    })
    .safeParse(runRows[0]);
  const planning: {
    id: string;
    outcome: string;
    attempted?: boolean;
    failureKind?: z.infer<typeof ProposalFailureKindSchema>;
    elapsedMs?: number;
    timeoutMs?: number;
    diagnostic?: z.infer<typeof ProviderDiagnosticSchema>;
  }[] = [];
  const evidence: {
    id: string;
    trialId: string;
    kind: string;
    outcome?: string;
  }[] = [];
  for (const row of evidenceRows) {
    const e = z
      .object({
        id: z.uuid(),
        trial_id: z.uuid(),
        kind: z.enum([
          'PLANNING RESULT',
          'BASELINE',
          'BASELINE FAILURE',
          'PREDICATE',
          'EXPLORATION',
          'REPLAY',
          'MINIMIZATION',
          'ARTIFACT',
        ]),
        evaluation: z.unknown(),
      })
      .safeParse(row);
    if (!e.success) continue;
    if (e.data.kind === 'PLANNING RESULT') {
      const t = z
        .object({
          telemetry: z.object({
            outcome: z.enum([
              'PROPOSED',
              'MODEL ERROR',
              'MODEL PLAN ERROR',
              'CANCELLED',
            ]),
            attempted: z.boolean().optional(),
            failureKind: ProposalFailureKindSchema.optional(),
            elapsedMs: z.number().finite().nonnegative().optional(),
            timeoutMs: z.number().finite().positive().max(30000).optional(),
            diagnostic: ProviderDiagnosticSchema.optional(),
          }),
        })
        .safeParse(e.data.evaluation);
      if (t.success) planning.push({ id: e.data.id, ...t.data.telemetry });
      else {
        const reply = z
          .object({
            provider: z.literal('gemini'),
            model: safeModel,
            usage: z.object({ estimated: z.boolean() }),
          })
          .safeParse(e.data.evaluation);
        if (
          reply.success &&
          typeof e.data.evaluation === 'object' &&
          e.data.evaluation !== null &&
          Object.hasOwn(e.data.evaluation, 'proposal')
        )
          planning.push({ id: e.data.id, outcome: 'PROPOSED' });
      }
    } else {
      const verdict = z
        .object({ outcome: outcome.optional(), verdict: outcome.optional() })
        .safeParse(e.data.evaluation);
      evidence.push({
        id: e.data.id,
        trialId: e.data.trial_id,
        kind: e.data.kind,
        ...(verdict.success && (verdict.data.outcome ?? verdict.data.verdict)
          ? { outcome: verdict.data.outcome ?? verdict.data.verdict }
          : {}),
      });
    }
  }
  const steps = stepRows.flatMap((row) => {
    const s = z
      .object({
        phase: z.enum([
          'RESET',
          'BASELINE',
          'EXPLORATION',
          'REPLAY',
          'MINIMIZATION',
          'ARTIFACT',
        ]),
        outcome: z.enum(['INTENT', 'RESPONSE', 'EXECUTION ERROR']),
      })
      .safeParse(row);
    return s.success ? [s.data] : [];
  });
  const findings = findingRows.flatMap((row) => {
    const f = z
      .object({
        id: z.uuid(),
        current_classification: classification,
        original_journey_id: z.uuid(),
        minimized_journey_id: z.uuid().nullable(),
      })
      .safeParse(row);
    return f.success ? [f.data] : [];
  });
  const journeys = journeyRows.flatMap((row) => {
    const j = z
      .object({ id: z.uuid(), action_count: z.int().nonnegative() })
      .safeParse(row);
    return j.success ? [j.data] : [];
  });
  return {
    findings,
    journeys,
    ...(run.success
      ? {
          runId: run.data.id,
          stopReason: safeReason(run.data.stop_reason),
          ...(run.data.counters.modelCalls === undefined
            ? {}
            : { modelCallCount: run.data.counters.modelCalls }),
          requestBudgetUsed: run.data.counters.usedRequests,
          requestBudgetLimit: run.data.counters.limits.requests,
        }
      : {}),
    planning,
    evidence,
    steps,
  };
}
export function applyDurableDiagnostics(
  d: GateDiagnostics,
  evidence: ReturnType<typeof projectDurableDiagnostics>,
) {
  if (evidence.modelCallCount !== undefined)
    d.details.modelCallCount = evidence.modelCallCount;
  if (evidence.runId) d.details.runId = evidence.runId;
  if (evidence.requestBudgetUsed !== undefined)
    d.details.requestBudgetUsed = evidence.requestBudgetUsed;
  if (evidence.requestBudgetLimit !== undefined)
    d.details.requestBudgetLimit = evidence.requestBudgetLimit;
  const finding = evidence.findings.at(-1);
  if (finding) {
    d.details.discoveryStatus = 'OBSERVED VIOLATION';
    if (finding.current_classification !== 'OBSERVED VIOLATION')
      d.details.confirmationStatus = finding.current_classification;
    const original = evidence.journeys.find(
      (j) => j.id === finding.original_journey_id,
    );
    if (original) d.details.originalJourneyLength = original.action_count;
    const best = evidence.journeys.find(
      (j) => j.id === finding.minimized_journey_id,
    );
    if (best) d.details.bestVerifiedJourneyLength = best.action_count;
  }
  if (d.stage !== 'DISCOVERY') return;
  const lastPlan = evidence.planning.at(-1);
  if (lastPlan?.attempted !== undefined)
    d.details.providerAttempted = lastPlan.attempted;
  if (lastPlan?.failureKind)
    d.details.providerFailureKind = lastPlan.failureKind;
  if (lastPlan?.elapsedMs !== undefined)
    d.details.proposalElapsedMs = lastPlan.elapsedMs;
  if (lastPlan?.timeoutMs !== undefined)
    d.details.proposalTimeoutMs = lastPlan.timeoutMs;
  if (lastPlan && lastPlan.outcome !== 'PROPOSED') {
    d.providerDiagnostic = lastPlan.diagnostic;
    d.stage =
      lastPlan.failureKind === 'MODEL_CONFIGURATION' ||
      lastPlan.failureKind === 'INVALID_TIMEOUT'
        ? 'PROVIDER_CONFIGURATION'
        : lastPlan.failureKind === 'TIMEOUT'
          ? 'PLANNING_DEADLINE'
          : lastPlan.diagnostic?.stage === 'CONTRACT_VALIDATION'
            ? 'PROPOSAL_VALIDATION'
            : lastPlan.diagnostic?.stage === 'RESPONSE_PARSE'
              ? 'GEMINI_RESPONSE_PARSE'
              : 'GEMINI_PROPOSAL';
    if (lastPlan.diagnostic?.stage === 'CONTRACT_VALIDATION')
      d.lastCompletedStage = 'GEMINI_RESPONSE_PARSE';
    d.details.stopReason = lastPlan.outcome;
  } else if (evidence.evidence.some((e) => e.kind === 'BASELINE FAILURE')) {
    d.stage = 'FRESH_BASELINE';
    if (lastPlan?.outcome === 'PROPOSED')
      d.lastCompletedStage = 'GEMINI_PROPOSAL';
  } else if (
    evidence.evidence.some((e) => e.kind === 'PREDICATE' && e.outcome)
  ) {
    d.lastCompletedStage = 'PREDICATE_EVALUATION';
    d.stage = 'OBSERVED_VIOLATION';
  } else if (
    evidence.evidence.some(
      (e) => e.kind === 'BASELINE' && e.outcome === 'SATISFIED',
    )
  ) {
    d.lastCompletedStage = 'FRESH_BASELINE';
    d.stage = 'DISCOVERY_EXECUTION';
  } else if (lastPlan?.outcome === 'PROPOSED')
    d.lastCompletedStage = 'GEMINI_PROPOSAL';
}

// Read-only metadata for an admission refusal. Never tries to acquire/unlock a lock.
export function projectSupervisorOwnership(rows: unknown[]) {
  const holders = rows.flatMap((row) => {
    const parsed = z
      .object({
        backend_pid: z.int().positive(),
        state: z
          .enum([
            'active',
            'idle',
            'idle in transaction',
            'idle in transaction (aborted)',
            'fastpath function call',
            'disabled',
          ])
          .nullable(),
      })
      .safeParse(row);
    return parsed.success
      ? [
          {
            backendPid: parsed.data.backend_pid,
            ...(parsed.data.state ? { state: parsed.data.state } : {}),
          },
        ]
      : [];
  });
  return { holders };
}
export async function inspectSupervisorOwnership(
  client: import('pg').PoolClient,
) {
  const { supervisorLockId } = await import('../src/server/run-supervisor');
  const rows = await client.query(
    "SELECT l.pid AS backend_pid,a.state FROM pg_locks l LEFT JOIN pg_stat_activity a ON a.pid=l.pid WHERE l.locktype='advisory' AND l.granted AND l.classid=0 AND l.objid=$1 AND l.objsubid=1 AND l.database=(SELECT oid FROM pg_database WHERE datname=current_database()) ORDER BY l.pid",
    [supervisorLockId],
  );
  return projectSupervisorOwnership(rows.rows);
}
