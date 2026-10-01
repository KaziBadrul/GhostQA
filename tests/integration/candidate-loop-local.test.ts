import { randomUUID } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import type { PoolClient } from 'pg';
import type { StepValue } from '../../src/engine/execution/variables';
import type { RunSupervisor } from '../../src/server/run-supervisor';
import { makeRun } from '../helpers/run';
import { makeJourney } from '../helpers/journey';
import { SecretVault } from '../../src/engine/secrets/vault';
import { RunRepository } from '../../src/server/repositories/runs';
import { EvidenceSchema } from '../../src/engine/contracts';
const boundaries = vi.hoisted(() => ({
  fresh: vi.fn(),
  execute: vi.fn(),
  save: vi.fn(),
}));
vi.mock('../../src/engine/fresh-state/manager', () => ({
  establishFreshState: boundaries.fresh,
}));
vi.mock('../../src/engine/execution/journey', () => ({
  executeJourney: boundaries.execute,
}));
vi.mock('../../src/server/repositories/evidence', () => ({
  saveEvidence: boundaries.save,
}));
import { explore } from '../../src/engine/session/explore';

test.each([
  [403, 'OBSERVED VIOLATION'],
  [200, null],
  [null, 'INCONCLUSIVE'],
] as const)(
  'local orchestration evaluates status %s then persists only %s',
  async (status, classification) => {
    const run = makeRun(randomUUID());
    const journey = makeJourney();
    journey.predicateRef = {
      id: run.predicates[0]!.id,
      version: 1,
      hash: run.predicates[0]!.canonicalHash,
    };
    const trialId = randomUUID();
    const baseline = {
      id: randomUUID(),
      runId: run.id,
      trialId,
      resetStepIds: ['reset'],
      checkStepIds: ['read'],
      verdict: 'SATISFIED',
      assertionIds: [randomUUID()],
    };
    const vault = new SecretVault();
    const results = new Map<string, StepValue>();
    if (status !== null)
      results.set('inspect', {
        status,
        body: {},
        headers: {},
        truncated: false,
      });
    const trial = {
      id: trialId,
      baseline,
      values: { vault, inputs: {}, results },
    };
    boundaries.fresh.mockReset().mockResolvedValue(trial);
    boundaries.execute.mockReset().mockResolvedValue([]);
    boundaries.save
      .mockReset()
      .mockImplementation(async (_client, e) => EvidenceSchema.parse(e));
    const query = vi.fn(async () => ({ rowCount: 1, rows: [] }));
    const client = { query } as unknown as PoolClient;
    const repository = new RunRepository(client);
    vi.spyOn(repository, 'trace').mockResolvedValue({
      run: {},
      steps: [],
      journeys: [journey],
      evidence: [],
      observations: [
        {
          id: randomUUID(),
          runId: run.id,
          trialId,
          stepId: 'inspect',
          stateMappings: [],
          result: {
            stepId: 'inspect',
            status: status ?? 200,
            outcome: 'RESPONSE',
            sanitizedRequest: {},
            sanitizedResponse: {},
            truncated: false,
            startedAt: new Date().toISOString(),
            elapsedMs: 0,
          },
        },
      ],
    });
    const owner = {
      snapshot: run,
      client,
      repository,
      stopReason: undefined,
      assertAuthority: vi.fn(),
      assertTrial: vi.fn(),
      finishTrial: vi.fn(),
      planningResult: vi.fn(),
      stop: vi.fn(),
      plan: vi
        .fn()
        .mockResolvedValueOnce({
          reply: { proposal: journey },
          roundId: randomUUID(),
        })
        .mockRejectedValue(new Error('JOURNEY LIMIT')),
    };
    const provider = { propose: vi.fn() };
    const result = await explore(owner as unknown as RunSupervisor, provider);
    expect(result.stopReason).toBe('JOURNEY LIMIT');
    expect(boundaries.fresh).toHaveBeenCalledBefore(boundaries.execute);
    const inserted = query.mock.calls.find((call) =>
      (call as unknown as [string])[0].startsWith('INSERT INTO findings'),
    ) as unknown as [string, unknown[]] | undefined;
    expect(inserted?.[1][6] ?? null).toBe(classification);
    expect(provider.propose).not.toHaveBeenCalled(); // Only supervisor.plan owns that call.
    expect(result.trials).toHaveLength(1);
  },
);
