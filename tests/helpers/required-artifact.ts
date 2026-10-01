// Supplied acceptance setup only. These journeys never count as benchmark discovery.
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import { startInventoryFixture } from '../../fixtures/api/inventory';
import { startWorkflowFixture } from '../../fixtures/api/workflow';
import {
  requiredConfiguration,
  evaluatorJourney,
  startRequiredFixture,
  type RequiredFixture,
} from '../../fixtures/required';
import { isolatedDatabase } from './database';
import { migrate } from '../../src/server/migrate';
import { RunSupervisor } from '../../src/server/run-supervisor';
import { explore } from '../../src/engine/session/explore';
import { replayCandidate } from '../../src/engine/verification/replay';
import { minimizeFinding } from '../../src/engine/minimization/greedy';
import {
  loadFindingJourney,
  loadTrialEvidence,
  verificationApprovals,
} from '../../src/server/repositories/findings';
import { generateManifest } from '../../src/engine/exports/manifest';
import { registerArtifact } from '../../src/server/repositories/artifacts';
import { canonical } from '../../src/engine/detection/predicate';
import type { PoolClient } from 'pg';
export async function originatingState(client: PoolClient) {
  const tables = [
    'projects',
    'approvals',
    'runs',
    'predicates',
    'journeys',
    'step_records',
    'observations',
    'evidence',
    'findings',
    'finding_transitions',
    'artifacts',
  ];
  const state: Record<string, unknown[]> = {};
  for (const table of tables)
    state[table] = (
      await client.query(`SELECT * FROM ${table} ORDER BY id`)
    ).rows;
  return state;
}
export async function requiredArtifact(entry: RequiredFixture, requests = 15) {
  let fixture = await startRequiredFixture(entry, false);
  const db = await isolatedDatabase();
  let supervisor: RunSupervisor | undefined;
  try {
    await migrate(db.client, resolve('migrations'));
    const identity = { provider: 'evaluator', model: 'supplied-journey' };
    const run = await requiredConfiguration(
      entry,
      fixture.openapi,
      fixture.url,
      identity,
    );
    run.budget.limits.requests = requests;
    await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      run.projectId,
      'supplied artifact acceptance',
    ]);
    await db.client.query(
      "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'SCOPE',$3,$4)",
      [
        run.scope.approvalId,
        run.projectId,
        run.apiSnapshot.contentHash,
        run.scope,
      ],
    );
    supervisor = await RunSupervisor.acquire(db.client);
    await supervisor.accept(run);
    const journey = evaluatorJourney(entry, run);
    const discovery = await explore(
      supervisor,
      {
        identity,
        propose: async () => ({
          ...identity,
          proposal: journey,
          usage: { estimated: true },
        }),
      },
      {},
      true,
    );
    if (discovery.candidate?.classification !== 'OBSERVED VIOLATION')
      throw Error('SUPPLIED ACCEPTANCE SOURCE REQUIRED');
    const original = await loadFindingJourney(
      db.client,
      supervisor.snapshot,
      discovery.candidate,
    );
    const confirmed = await replayCandidate(
      supervisor,
      supervisor.snapshot,
      original,
      discovery.candidate,
    );
    if (confirmed.finding.classification !== 'CONFIRMED')
      throw Error('CONFIRMED SOURCE REQUIRED');
    const minimization = await minimizeFinding(
      supervisor,
      supervisor.snapshot,
      original,
      confirmed.finding,
    );
    const initial = await loadTrialEvidence(
      db.client,
      supervisor.snapshot,
      confirmed.finding.initialEvidenceId,
      'EXPLORATION',
      original,
    );
    const replay = await loadTrialEvidence(
      db.client,
      supervisor.snapshot,
      confirmed.evidence.id,
      'REPLAY',
      original,
    );
    const eligibility = await verificationApprovals(
      db.client,
      supervisor.snapshot,
      minimization.finding,
    );
    const generated = generateManifest({
      run: supervisor.snapshot,
      original,
      minimization,
      initial,
      replays: [replay],
      approvals: eligibility.replayApprovals,
      specificationAssertions: eligibility.specificationAssertions,
      artifactId: randomUUID(),
      generatedAt: new Date().toISOString(),
      runnerVersion: 'manifest-v1',
    });
    await registerArtifact(db.client, generated);
    const origin = supervisor;
    return {
      s: origin,
      run,
      client: db.client,
      generated,
      initial,
      replay,
      get fixture() {
        return fixture;
      },
      async variant(repaired: boolean) {
        const port = fixture.port,
          document = canonical(fixture.openapi);
        await fixture.close();
        fixture = await (entry.id === 'order-lifecycle'
          ? startOrderFixture(repaired, port)
          : entry.id === 'inventory'
            ? startInventoryFixture(repaired, port)
            : startWorkflowFixture(repaired, port));
        if (canonical(fixture.openapi) !== document)
          throw Error('PUBLIC CONTRACT CHANGED');
      },
      async close() {
        await origin.shutdown();
        await db.close();
        await fixture.close();
      },
    };
  } catch (error) {
    await supervisor?.shutdown();
    await db.close();
    await fixture.close();
    throw error;
  }
}
