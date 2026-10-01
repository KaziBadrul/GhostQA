import { randomUUID } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import type { PoolClient } from 'pg';
import type {
  Evidence,
  Observation,
  BaselineEvidence,
} from '../../src/engine/contracts';
import { makeRun } from '../helpers/run';
import { makeJourney } from '../helpers/journey';
import { evaluatePredicate } from '../../src/engine/detection/predicate';
import { detectCandidate } from '../../src/engine/detection/candidates';
import { SecretVault } from '../../src/engine/secrets/vault';
import { RunRepository } from '../../src/server/repositories/runs';

function example(status = 403) {
  const run = makeRun(randomUUID());
  const journey = makeJourney();
  journey.predicateRef = {
    id: run.predicates[0]!.id,
    version: run.predicates[0]!.version,
    hash: run.predicates[0]!.canonicalHash,
  };
  const trialId = randomUUID();
  const vault = new SecretVault();
  const baseline: BaselineEvidence = {
    id: randomUUID(),
    runId: run.id,
    trialId,
    resetStepIds: ['reset'],
    checkStepIds: ['read'],
    verdict: 'SATISFIED',
    assertionIds: [randomUUID()],
  };
  const observation: Observation = {
    id: randomUUID(),
    runId: run.id,
    trialId,
    stepId: 'inspect',
    stateMappings: [],
    result: {
      stepId: 'inspect',
      status,
      sanitizedRequest: {},
      sanitizedResponse: {},
      outcome: 'RESPONSE',
      truncated: false,
      startedAt: new Date().toISOString(),
      elapsedMs: 1,
    },
  };
  const outcome = evaluatePredicate(run.predicates[0]!, {
    vault,
    inputs: {},
    results: new Map([
      ['inspect', { status, body: {}, headers: {}, truncated: false }],
    ]),
  });
  const evidence: Evidence = {
    id: randomUUID(),
    runId: run.id,
    trialId,
    phase: 'EXPLORATION',
    predicateRef: journey.predicateRef,
    baselineEvidenceId: baseline.id,
    observationIds: [observation.id],
    outcome,
    symbolicOperands: {},
  };
  return { run, journey, baseline, observation, evidence, vault };
}
function detect(x: ReturnType<typeof example>, approved = new Set<string>()) {
  return detectCandidate(
    x.run,
    x.journey,
    x.evidence,
    x.baseline,
    [x.observation],
    approved,
  );
}

test('deterministic initial violation creates OBSERVED VIOLATION with exact identity and evidence, without model input', () => {
  const x = example();
  expect(x.evidence.outcome).toBe('VIOLATED');
  const finding = detect(x)!;
  expect(finding.classification).toBe('OBSERVED VIOLATION');
  expect(finding.predicateRef).toEqual(x.journey.predicateRef);
  expect(finding.originalJourneyId).toBe(x.journey.id);
  expect(finding.initialEvidenceId).toBe(x.evidence.id);
  expect(finding.replayEvidenceIds).toEqual([]);
  expect(finding.transitions).toEqual([
    {
      prior: null,
      next: 'OBSERVED VIOLATION',
      evidenceRefs: [x.evidence.id],
      reason: 'INITIAL PREDICATE VIOLATION',
    },
  ]);
});
test.each(['SATISFIED', 'NOT APPLICABLE'] as const)(
  '%s does not produce a candidate',
  (outcome) => {
    const x = example(200);
    x.evidence.outcome = outcome;
    expect(detect(x)).toBeNull();
  },
);
test('unevaluable predicate remains INCONCLUSIVE', () => {
  const x = example();
  x.evidence.outcome = 'UNEVALUABLE';
  expect(detect(x)?.classification).toBe('INCONCLUSIVE');
});
test('unapproved model hypothesis cannot gain approval or CONFIRMED', () => {
  const x = example();
  x.run.predicates[0]!.source = 'AGENT_HYPOTHESIS';
  x.run.predicates[0]!.approvalRef = randomUUID();
  expect(detect(x)?.classification).toBe('INCONCLUSIVE');
  expect(
    detect(x, new Set([x.run.predicates[0]!.approvalRef!]))?.classification,
  ).toBe('OBSERVED VIOLATION');
});
test('execution errors remain execution outcomes, never suspicious violations', () => {
  const x = example();
  x.observation.result.outcome = 'EXECUTION ERROR';
  x.evidence.outcome = 'UNEVALUABLE';
  expect(detect(x)?.classification).toBe('INCONCLUSIVE');
  expect(x.observation.result.outcome).toBe('EXECUTION ERROR');
});
test.each(['id', 'version', 'hash'] as const)(
  'predicate %s mismatch fails closed',
  (key) => {
    const x = example();
    x.evidence.predicateRef = {
      ...x.evidence.predicateRef,
      [key]:
        key === 'id' ? randomUUID() : key === 'version' ? 2 : 'b'.repeat(64),
    };
    expect(() => detect(x)).toThrow('CANDIDATE EVIDENCE MISMATCH');
  },
);
test.each(['trial', 'run', 'step', 'baseline', 'observation'] as const)(
  'wrong %s evidence fails closed',
  (kind) => {
    const x = example();
    if (kind === 'trial') x.observation.trialId = randomUUID();
    if (kind === 'run') x.observation.runId = randomUUID();
    if (kind === 'step') x.observation.stepId = 'other';
    if (kind === 'baseline') x.baseline.id = randomUUID();
    if (kind === 'observation') x.evidence.observationIds = [randomUUID()];
    expect(() => detect(x)).toThrow('CANDIDATE EVIDENCE MISMATCH');
  },
);
function clientMock(missing = false) {
  const queries: { sql: string; values: unknown[] }[] = [];
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    queries.push({ sql, values });
    return {
      rowCount: sql.startsWith('SELECT e.id') && missing ? 0 : 1,
      rows: [],
    };
  });
  return { client: { query } as unknown as PoolClient, queries };
}
test('repository integrates sanitized evidence into durable initial finding/transition only', async () => {
  const x = example();
  const db = clientMock();
  const secret = 'private-issued-reset-token';
  x.vault.register(secret);
  x.observation.result.sanitizedResponse = x.vault.sanitize({ token: secret });
  x.evidence.symbolicOperands = x.vault.sanitize({ token: secret });
  const f = await new RunRepository(db.client).initialCandidate(
    x.run,
    x.journey,
    x.evidence,
    x.baseline,
    [x.observation],
    x.vault,
  );
  expect(f?.classification).toBe('OBSERVED VIOLATION');
  expect(JSON.stringify(db.queries)).not.toContain(secret);
  expect(db.queries.some((q) => q.sql.startsWith('INSERT INTO findings'))).toBe(
    true,
  );
  expect(
    db.queries.some((q) => q.sql.startsWith('INSERT INTO finding_transitions')),
  ).toBe(true);
  expect(db.queries.at(-1)?.sql).toBe('COMMIT');
});
test('missing durable evidence rolls back without a finding', async () => {
  const x = example();
  const db = clientMock(true);
  await expect(
    new RunRepository(db.client).initialCandidate(
      x.run,
      x.journey,
      x.evidence,
      x.baseline,
      [x.observation],
      x.vault,
    ),
  ).rejects.toThrow('CANDIDATE EVIDENCE MISMATCH');
  expect(db.queries.some((q) => q.sql.startsWith('INSERT INTO findings'))).toBe(
    false,
  );
  expect(db.queries.at(-1)?.sql).toBe('ROLLBACK');
});
test('satisfied evaluation requires no database write', async () => {
  const x = example(200);
  const db = clientMock();
  expect(
    await new RunRepository(db.client).initialCandidate(
      x.run,
      x.journey,
      x.evidence,
      x.baseline,
      [x.observation],
      x.vault,
    ),
  ).toBeNull();
  expect(db.queries).toEqual([]);
});

test('execution failure cannot be promoted by a claimed violation', () => {
  const x = example();
  x.observation.result.outcome = 'EXECUTION ERROR';
  expect(detect(x)?.classification).toBe('INCONCLUSIVE');
});
test('ungrounded specification provenance does not grant eligibility', () => {
  const x = example();
  x.run.predicates[0]!.source = 'SPEC_ASSERTION';
  x.run.predicates[0]!.sourceRef = 'openapi:status:invented';
  expect(detect(x)?.classification).toBe('INCONCLUSIVE');
});
test('persistence guard binds exact frozen predicates, scope and observations', async () => {
  const x = example();
  const db = clientMock();
  await new RunRepository(db.client).initialCandidate(
    x.run,
    x.journey,
    x.evidence,
    x.baseline,
    [x.observation],
    x.vault,
  );
  const guard = db.queries.find((q) => q.sql.startsWith('SELECT e.id'))!;
  expect(guard.sql).toContain("r.immutable_snapshot->'predicates'=$11::jsonb");
  expect(guard.sql).toContain("r.immutable_snapshot->'scope'=$12::jsonb");
  expect(guard.sql).toContain('expected=o.sanitized_summary');
  expect(JSON.parse(guard.values[9] as string)).toEqual([x.observation]);
});

test('duplicate observations cannot substitute for required evidence', () => {
  const x = example();
  x.evidence.observationIds.push(randomUUID());
  expect(() =>
    detectCandidate(x.run, x.journey, x.evidence, x.baseline, [
      x.observation,
      x.observation,
    ]),
  ).toThrow('CANDIDATE EVIDENCE MISMATCH');
});
test('observation result must refer to the same step', () => {
  const x = example();
  x.observation.result.stepId = 'different';
  expect(() => detect(x)).toThrow('CANDIDATE EVIDENCE MISMATCH');
});
