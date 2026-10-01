import { resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import { isolatedDatabase } from '../helpers/database';
import { migrate } from '../../src/server/migrate';
import { RunSupervisor } from '../../src/server/run-supervisor';
import { runVerticalSlice } from '../../src/cli/vertical-slice';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import { orderConfiguration } from '../../scripts/t035-configuration';
import {
  GateDiagnostics,
  inspectSupervisorOwnership,
} from '../../scripts/t044-diagnostics';
import { orderJourney } from '../helpers/verification';

test('T044 refuses an idle owner across schemas before run admission; explicit owner shutdown permits admission', async () => {
  const ownerDB = await isolatedDatabase();
  const acceptanceDB = await isolatedDatabase();
  const target = await startOrderFixture(false);
  let owner: RunSupervisor | undefined;
  try {
    await migrate(ownerDB.client, resolve('migrations'));
    await migrate(acceptanceDB.client, resolve('migrations'));
    owner = await RunSupervisor.acquire(ownerDB.client);
    const pid = (await ownerDB.client.query('SELECT pg_backend_pid() AS pid'))
      .rows[0].pid;
    // An idle server owns the lock before any run exists; schema isolation is not lock isolation.
    expect(
      (await ownerDB.client.query('SELECT count(*) AS count FROM runs')).rows[0]
        .count,
    ).toBe('0');
    const { run } = await orderConfiguration(
      target.openapi,
      target.url,
      'integration-model',
    );
    run.modelConfiguration = {
      provider: 'integration',
      model: 'integration-model',
    };
    await acceptanceDB.client.query(
      'INSERT INTO projects(id,name) VALUES($1,$2)',
      [run.projectId, 'T044 admission regression'],
    );
    await acceptanceDB.client.query(
      "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'SCOPE',$3,$4)",
      [
        run.scope.approvalId,
        run.projectId,
        run.apiSnapshot.contentHash,
        run.scope,
      ],
    );
    const propose = vi.fn(async () => ({
      proposal: orderJourney(run),
      provider: 'integration',
      model: 'integration-model',
      usage: { estimated: false, inputTokens: 1, outputTokens: 1 },
    }));
    const provider = {
      identity: { provider: 'integration', model: 'integration-model' },
      propose,
    };
    const d = new GateDiagnostics();
    d.progress('SCOPE_APPROVAL', true);
    await expect(
      runVerticalSlice(
        acceptanceDB.client,
        run,
        provider,
        {},
        undefined,
        false,
        true,
        d.progress,
      ),
    ).rejects.toThrow('SUPERVISOR BUSY');
    expect(d.failure(new Error('SUPERVISOR BUSY'))).toMatchObject({
      failedStage: 'RUN_ADMISSION',
      lastCompletedStage: 'SCOPE_APPROVAL',
    });
    expect(propose).not.toHaveBeenCalled();
    for (const table of ['runs', 'journeys', 'step_records', 'evidence'])
      expect(
        (
          await acceptanceDB.client.query(
            `SELECT count(*) AS count FROM ${table}`,
          )
        ).rows[0].count,
      ).toBe('0');
    const ownership = await inspectSupervisorOwnership(acceptanceDB.client);
    expect(ownership.holders).toContainEqual({
      backendPid: pid,
      state: 'idle',
    });
    // A refused contender and its diagnostics cannot release or steal the existing owner's lock.
    await expect(RunSupervisor.acquire(acceptanceDB.client)).rejects.toThrow(
      'SUPERVISOR BUSY',
    );
    await owner.shutdown();
    owner = undefined;
    expect(
      (await inspectSupervisorOwnership(acceptanceDB.client)).holders,
    ).toEqual([]);
    const result = await runVerticalSlice(
      acceptanceDB.client,
      run,
      provider,
      {},
      undefined,
      false,
      true,
      d.progress,
    );
    expect(result.candidate?.classification).toBe('OBSERVED VIOLATION');
    expect(
      'reproduction' in result &&
        result.reproduction?.supervised.artifact.verification,
    ).toBe('VERIFIED');
    expect(propose).toHaveBeenCalledTimes(1);
    // Existing finally shutdown releases ownership after the complete automated pipeline as well.
    const next = await RunSupervisor.acquire(ownerDB.client);
    await next.shutdown();
  } finally {
    await owner?.shutdown();
    await acceptanceDB.close();
    await ownerDB.close();
    await target.close();
  }
});
