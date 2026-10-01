import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import {
  GateDiagnostics,
  projectDurableDiagnostics,
  applyDurableDiagnostics,
} from '../../scripts/t044-diagnostics';
const row = (kind: string, evaluation: unknown) => ({
  id: randomUUID(),
  trial_id: randomUUID(),
  kind,
  evaluation,
});
test('failure identifies started and completed stages without claiming unseen stages', () => {
  const d = new GateDiagnostics();
  expect(d.failure(new Error('secret raw error'))).not.toHaveProperty(
    'lastCompletedStage',
  );
  d.progress('MANIFEST_GENERATION', true);
  d.progress('SUPERVISED_VERIFICATION', false);
  expect(d.failure(new Error('BUDGET EXHAUSTED'))).toMatchObject({
    failedStage: 'SUPERVISED_VERIFICATION',
    lastCompletedStage: 'MANIFEST_GENERATION',
    reason: 'BUDGET EXHAUSTED',
    result: 'FAIL',
  });
});
test('only allowlisted error reasons survive; injected secrets and protected metadata are absent', () => {
  const d = new GateDiagnostics();
  d.configured('secret model with whitespace');
  const json = JSON.stringify(
    d.failure(
      Object.assign(new Error('authorization: bearer protected-value'), {
        headers: { authorization: 'protected-value' },
        status: 400,
      }),
    ),
  );
  expect(json).not.toMatch(/protected-value|authorization|headers|model/);
});
test('no qualifying live journey reports discovery without inventing confirmation or lengths', () => {
  const d = new GateDiagnostics();
  d.observe({ stopReason: 'JOURNEY LIMIT', trials: [] });
  expect(
    d.failure(new Error('DISCOVERY OR CONFIRMATION INCOMPLETE')),
  ).toMatchObject({ failedStage: 'DISCOVERY', stopReason: 'JOURNEY LIMIT' });
  expect(d.details).not.toHaveProperty('confirmationStatus');
  expect(d.details).not.toHaveProperty('originalJourneyLength');
});
test('failed confirmation remains distinct from missing discovery', () => {
  const d = new GateDiagnostics();
  d.observe({
    stopReason: 'VERIFICATION COMPLETE',
    candidate: { classification: 'OBSERVED VIOLATION' },
    verification: { finding: { classification: 'INCONCLUSIVE' } },
  });
  expect(d.stage).toBe('CONFIRMATION');
  expect(d.details.confirmationStatus).toBe('INCONCLUSIVE');
});
test('unverified supervised result retains actual verdict and originating budget', () => {
  const d = new GateDiagnostics();
  d.observe({
    stopReason: 'BUDGET EXHAUSTED',
    candidate: { classification: 'OBSERVED VIOLATION' },
    verification: { finding: { classification: 'CONFIRMED' } },
    reproduction: {
      minimization: { originalLength: 4, bestLength: 3 },
      supervised: {
        artifact: { verification: 'UNVERIFIED' },
        evidence: { outcome: 'UNEVALUABLE' },
      },
      finalBudget: { usedRequests: 17, limits: { requests: 20 } },
    },
  });
  expect(d.failure(new Error('REPRODUCTION INCOMPLETE'))).toMatchObject({
    failedStage: 'SUPERVISED_VERIFICATION',
    artifactStatus: 'UNVERIFIED',
    supervisedVerificationStatus: 'UNEVALUABLE',
    originalJourneyLength: 4,
    bestVerifiedJourneyLength: 3,
    requestBudgetUsed: 17,
    requestBudgetLimit: 20,
  });
});
test('durable projection preserves sanitized Gemini error metadata and strips context/body/secrets', () => {
  const e = projectDurableDiagnostics(
    [],
    [
      row('PLANNING RESULT', {
        telemetry: {
          outcome: 'MODEL ERROR',
          diagnostic: {
            stage: 'REQUEST',
            model: 'gemini-3.5-flash-lite',
            httpStatus: 400,
            apiStatus: 'INVALID_ARGUMENT',
          },
        },
        context: 'protected-value',
        body: 'protected-value',
      }),
    ],
    [
      {
        phase: 'RESET',
        outcome: 'RESPONSE',
        sanitized_request: { authorization: 'protected-value' },
      },
    ],
  );
  expect(e.planning[0]?.diagnostic?.httpStatus).toBe(400);
  expect(JSON.stringify(e)).not.toContain('protected-value');
  const d = new GateDiagnostics();
  d.stage = 'DISCOVERY';
  applyDurableDiagnostics(d, e);
  expect(d.stage).toBe('GEMINI_PROPOSAL');
});
test('local proposal contract failure differs from Gemini request failure', () => {
  const d = new GateDiagnostics();
  d.stage = 'DISCOVERY';
  applyDurableDiagnostics(
    d,
    projectDurableDiagnostics(
      [],
      [
        row('PLANNING RESULT', {
          telemetry: {
            outcome: 'MODEL PLAN ERROR',
            diagnostic: {
              stage: 'CONTRACT_VALIDATION',
              model: 'gemini-3.5-flash-lite',
            },
          },
        }),
      ],
      [],
    ),
  );
  expect(d.stage).toBe('PROPOSAL_VALIDATION');
});
test('valid SATISFIED discovery evidence is not misclassified as an engine or model error', () => {
  const d = new GateDiagnostics();
  d.stage = 'DISCOVERY';
  applyDurableDiagnostics(
    d,
    projectDurableDiagnostics(
      [],
      [row('PREDICATE', { outcome: 'SATISFIED' })],
      [],
    ),
  );
  expect(d.stage).toBe('OBSERVED_VIOLATION');
  expect(d.lastCompletedStage).toBe('PREDICATE_EVALUATION');
});
test('durable failed baseline identifies freshness stage without asserting reset success', () => {
  const d = new GateDiagnostics();
  d.stage = 'DISCOVERY';
  applyDurableDiagnostics(
    d,
    projectDurableDiagnostics([], [row('BASELINE FAILURE', {})], []),
  );
  expect(d.stage).toBe('FRESH_BASELINE');
  expect(d.lastCompletedStage).toBeUndefined();
});

test('failure snapshot persistence precedes destructive isolated-schema cleanup', async () => {
  const { readFile } = await import('node:fs/promises');
  const script = await readFile('scripts/t044-acceptance.ts', 'utf8');
  expect(script).toMatch(/projectDurableDiagnostics\s*\(\s*runs\.rows/);
  expect(script.indexOf('recordFailure(error, durable)')).toBeLessThan(
    script.indexOf('await db.close()'),
  );
  expect(script).toContain("{ flag: 'wx' }");
});
test('script emits PASS only after resource cleanup and retains original failure on snapshot-write error', async () => {
  const { readFile } = await import('node:fs/promises');
  const script = await readFile('scripts/t044-acceptance.ts', 'utf8');
  expect(script).toContain('acceptance()\n  .then(');
  expect(script).toContain(
    "diagnostics.details.failureEvidence = 'WRITE FAILED'",
  );
  expect(script).not.toContain('LIVE GATE INCOMPLETE; NO PASS RECORDED');
});

test('verified baseline alone never implies journey execution or predicate evaluation', () => {
  const d = new GateDiagnostics();
  d.stage = 'DISCOVERY';
  applyDurableDiagnostics(
    d,
    projectDurableDiagnostics(
      [],
      [row('BASELINE', { verdict: 'SATISFIED' })],
      [],
    ),
  );
  expect(d.stage).toBe('DISCOVERY_EXECUTION');
  expect(d.lastCompletedStage).toBe('FRESH_BASELINE');
});
test('actual successful planning-result representation is recognized without retaining the proposal', () => {
  const d = new GateDiagnostics();
  d.stage = 'DISCOVERY';
  const p = projectDurableDiagnostics(
    [],
    [
      row('PLANNING RESULT', {
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        usage: { estimated: false },
        proposal: { secret: 'protected-value' },
      }),
    ],
    [],
  );
  expect(p.planning[0]?.outcome).toBe('PROPOSED');
  expect(JSON.stringify(p)).not.toContain('protected-value');
  applyDurableDiagnostics(d, p);
  expect(d.lastCompletedStage).toBe('GEMINI_PROPOSAL');
});
test('validated provider metadata is available in concise failure JSON', () => {
  const d = new GateDiagnostics();
  d.stage = 'DISCOVERY';
  applyDurableDiagnostics(
    d,
    projectDurableDiagnostics(
      [],
      [
        row('PLANNING RESULT', {
          telemetry: {
            outcome: 'MODEL ERROR',
            diagnostic: {
              stage: 'REQUEST',
              model: 'gemini-3.5-flash-lite',
              httpStatus: 400,
              apiStatus: 'INVALID_ARGUMENT',
            },
          },
        }),
      ],
      [],
    ),
  );
  expect(
    d.failure(new Error('DISCOVERY OR CONFIRMATION INCOMPLETE')),
  ).toMatchObject({
    failedStage: 'GEMINI_PROPOSAL',
    providerDiagnostic: { httpStatus: 400, apiStatus: 'INVALID_ARGUMENT' },
  });
});

test('supervisor contention diagnostics retain only backend identity/state and strip SQL/connection secrets', async () => {
  const { projectSupervisorOwnership } =
    await import('../../scripts/t044-diagnostics');
  const d = new GateDiagnostics();
  d.progress('SCOPE_APPROVAL', true);
  d.progress('RUN_ADMISSION', false);
  d.supervisorOwnership = projectSupervisorOwnership([
    {
      backend_pid: 123,
      state: 'idle',
      query: 'protected-value',
      connection: 'protected-value',
    },
    { backend_pid: 'invalid', state: 'idle' },
  ]);
  const failure = d.failure(new Error('SUPERVISOR BUSY'));
  expect(failure).toMatchObject({
    failedStage: 'RUN_ADMISSION',
    lastCompletedStage: 'SCOPE_APPROVAL',
    supervisorOwnership: { holders: [{ backendPid: 123, state: 'idle' }] },
  });
  expect(JSON.stringify(failure)).not.toMatch(
    /protected-value|query|connection/,
  );
});

test('provider-attempt/deadline telemetry survives acceptance projection without inventing absent values', () => {
  const d = new GateDiagnostics();
  d.stage = 'DISCOVERY';
  applyDurableDiagnostics(
    d,
    projectDurableDiagnostics(
      [],
      [
        row('PLANNING RESULT', {
          telemetry: {
            outcome: 'MODEL ERROR',
            attempted: true,
            failureKind: 'TIMEOUT',
            elapsedMs: 30001,
            timeoutMs: 30000,
            raw: 'protected-value',
          },
        }),
      ],
      [],
    ),
  );
  expect(
    d.failure(new Error('DISCOVERY OR CONFIRMATION INCOMPLETE')),
  ).toMatchObject({
    failedStage: 'PLANNING_DEADLINE',
    providerAttempted: true,
    providerFailureKind: 'TIMEOUT',
    proposalElapsedMs: 30001,
    proposalTimeoutMs: 30000,
  });
  expect(JSON.stringify(d.failure(new Error('MODEL ERROR')))).not.toContain(
    'protected-value',
  );
  const old = new GateDiagnostics();
  old.stage = 'DISCOVERY';
  applyDurableDiagnostics(
    old,
    projectDurableDiagnostics(
      [],
      [row('PLANNING RESULT', { telemetry: { outcome: 'MODEL ERROR' } })],
      [],
    ),
  );
  expect(old.failure(new Error('MODEL ERROR'))).not.toHaveProperty(
    'providerAttempted',
  );
  expect(old.failure(new Error('MODEL ERROR'))).not.toHaveProperty(
    'providerFailureKind',
  );
});
test('an explicitly unattempted proposal remains false rather than absent or true', () => {
  const d = new GateDiagnostics();
  d.stage = 'DISCOVERY';
  applyDurableDiagnostics(
    d,
    projectDurableDiagnostics(
      [],
      [
        row('PLANNING RESULT', {
          telemetry: {
            outcome: 'MODEL ERROR',
            attempted: false,
            failureKind: 'MODEL_CONFIGURATION',
          },
        }),
      ],
      [],
    ),
  );
  expect(d.failure(new Error('MODEL ERROR'))).toMatchObject({
    failedStage: 'PROVIDER_CONFIGURATION',
    providerAttempted: false,
    providerFailureKind: 'MODEL_CONFIGURATION',
  });
});
