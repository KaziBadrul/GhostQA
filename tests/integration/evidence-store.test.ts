import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { isolatedDatabase } from '../helpers/database';
import { migrate } from '../../src/server/migrate';
import { RunRepository } from '../../src/server/repositories/runs';
import { makeRun } from '../helpers/run';
import { SecretVault } from '../../src/engine/secrets/vault';
import { storeObservation } from '../../src/engine/observations/store';
test('observation persists sanitized evidence only; append-only and project cascade', async () => {
  const db = await isolatedDatabase();
  try {
    await migrate(db.client, resolve('migrations'));
    const project = randomUUID();
    await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      project,
      'evidence',
    ]);
    const run = makeRun(project);
    const repository = new RunRepository(db.client);
    await repository.create(run);
    const step = randomUUID(),
      trial = randomUUID();
    const vault = new SecretVault();
    vault.register('private-issued-token');
    await repository.intent(
      {
        id: step,
        runId: run.id,
        trialId: trial,
        stepId: 'inspect',
        phase: 'EXPLORATION',
        ordinal: 0,
        request: {},
      },
      run.budget,
    );
    const observation = {
      id: randomUUID(),
      runId: run.id,
      trialId: trial,
      stepId: 'inspect',
      result: {
        stepId: 'inspect',
        status: 200,
        sanitizedRequest: {},
        sanitizedResponse: {
          token: 'private-issued-token',
          echo: 'private-issued-token',
        },
        truncated: false,
        startedAt: new Date().toISOString(),
        elapsedMs: 1,
        outcome: 'RESPONSE' as const,
      },
      stateMappings: [],
    };
    await storeObservation(db.client, step, observation, vault);
    const saved = (
      await db.client.query('SELECT sanitized_summary FROM observations')
    ).rows[0].sanitized_summary;
    expect(JSON.stringify(saved)).not.toContain('private-issued-token');
    expect(JSON.stringify(saved)).toContain('[SECRET_');
    await expect(
      db.client.query("UPDATE observations SET sanitized_summary='{}'"),
    ).rejects.toThrow('Immutable record');
    await db.client.query('DELETE FROM projects WHERE id=$1', [project]);
    expect(
      (await db.client.query('SELECT count(*)::int AS count FROM observations'))
        .rows[0].count,
    ).toBe(0);
  } finally {
    await db.close();
  }
});

import { freshHarness } from '../helpers/fresh';
import { makeJourney } from '../helpers/journey';
import { establishFreshState } from '../../src/engine/fresh-state/manager';
import { executeJourney } from '../../src/engine/execution/journey';
import { saveEvidence } from '../../src/server/repositories/evidence';
import { saveJourney } from '../../src/server/repositories/journeys';
import { summarize } from '../../src/engine/observations/summarize';
test('supervised execution stores linked sanitized observations and immutable journey before target dispatch', async () => {
  const h = await freshHarness(200, 200, {
    itemBody: {
      token: 'private-response-token',
      echo: 'private-response-token',
    },
  });
  try {
    const j = makeJourney();
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    await executeJourney(h.s, h.run, j, trial);
    const trace = await h.s.repository.trace(h.run.projectId, h.run.id);
    expect(trace.journeys[0]!.id).toBe(j.id);
    expect(trace.observations).toHaveLength(3);
    expect(trace.steps).toHaveLength(3);
    expect(JSON.stringify(trace)).not.toContain('private-response-token');
    expect(
      JSON.stringify(summarize(trace.observations, trial.values.vault)),
    ).not.toContain('private-response-token');
    await expect(
      h.client.query("UPDATE journeys SET definition='{}'"),
    ).rejects.toThrow('Immutable record');
    await expect(h.s.repository.trace(randomUUID(), h.run.id)).rejects.toThrow(
      'RUN NOT FOUND',
    );
    h.s.finishTrial();
    const replay = await establishFreshState(h.s, h.run, j, 'REPLAY', {});
    await executeJourney(h.s, h.run, j, replay);
    expect(
      (await h.s.repository.trace(h.run.projectId, h.run.id)).journeys,
    ).toHaveLength(1);
  } finally {
    await h.close();
  }
});
test('evidence must reference same-run same-trial verified baseline and observations', async () => {
  const h = await freshHarness();
  try {
    const j = makeJourney();
    j.predicateRef = {
      id: h.run.predicates[0]!.id,
      version: h.run.predicates[0]!.version,
      hash: h.run.predicates[0]!.canonicalHash,
    };
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    await executeJourney(h.s, h.run, j, trial);
    const trace = await h.s.repository.trace(h.run.projectId, h.run.id);
    const observations = trace.observations.filter(
      (o) => o.stepId === 'inspect',
    );
    const value = {
      id: randomUUID(),
      runId: h.run.id,
      trialId: trial.id,
      phase: 'EXPLORATION',
      predicateRef: j.predicateRef,
      baselineEvidenceId: trial.baseline.id,
      observationIds: observations.map((o) => o.id),
      outcome: 'SATISFIED',
      symbolicOperands: { token: 'private-evidence-token' },
    };
    trial.values.vault.register('private-evidence-token');
    const saved = await saveEvidence(h.client, value, trial.values.vault);
    await expect(
      saveEvidence(
        h.client,
        { ...value, id: randomUUID(), phase: 'REPLAY' },
        trial.values.vault,
      ),
    ).rejects.toThrow('EVIDENCE REFERENCE MISMATCH');
    await expect(
      saveEvidence(
        h.client,
        {
          ...value,
          id: randomUUID(),
          predicateRef: { ...value.predicateRef, id: randomUUID() },
        },
        trial.values.vault,
      ),
    ).rejects.toThrow('EVIDENCE REFERENCE MISMATCH');
    expect(JSON.stringify(saved)).not.toContain('private-evidence-token');
    await expect(
      h.client.query("UPDATE evidence SET evaluation='{}' WHERE id=$1", [
        saved.id,
      ]),
    ).rejects.toThrow('Immutable record');
    await expect(
      saveEvidence(
        h.client,
        { ...value, id: randomUUID(), trialId: randomUUID() },
        trial.values.vault,
      ),
    ).rejects.toThrow('EVIDENCE REFERENCE MISMATCH');
    await expect(
      saveEvidence(
        h.client,
        { ...value, id: randomUUID(), baselineEvidenceId: randomUUID() },
        trial.values.vault,
      ),
    ).rejects.toThrow('EVIDENCE REFERENCE MISMATCH');
    await expect(
      saveEvidence(
        h.client,
        { ...value, id: randomUUID(), observationIds: [] },
        trial.values.vault,
      ),
    ).rejects.toThrow('EVIDENCE OBSERVATIONS REQUIRED');
  } finally {
    await h.close();
  }
});
test('observation persistence failure stops before any later request', async () => {
  const h = await freshHarness();
  try {
    const j = makeJourney();
    j.steps.push({ ...j.steps[0]!, id: 'later' });
    const trial = await establishFreshState(h.s, h.run, j, 'EXPLORATION', {});
    h.s.repository.observation = async () => {
      throw new Error('storage unavailable');
    };
    await expect(executeJourney(h.s, h.run, j, trial)).rejects.toThrow();
    expect(h.calls).toHaveLength(3);
    const trace = await h.s.repository.trace(h.run.projectId, h.run.id);
    expect(trace.steps).toHaveLength(3);
    expect(trace.observations).toHaveLength(2);
  } finally {
    await h.close();
  }
});
test('journey persistence failure forbids even reset dispatch', async () => {
  const h = await freshHarness();
  try {
    await h.client.query('ALTER TABLE journeys RENAME TO unavailable_journeys');
    await expect(
      establishFreshState(h.s, h.run, makeJourney(), 'EXPLORATION', {}),
    ).rejects.toThrow('STORAGE ERROR');
    expect(h.calls).toHaveLength(0);
  } finally {
    await h.close();
  }
});
test('mutated journey identity cannot overwrite stored reproduction', async () => {
  const h = await freshHarness();
  try {
    const j = makeJourney();
    await saveJourney(
      h.client,
      h.run.id,
      'EXPLORATION',
      j,
      0,
      new SecretVault(),
    );
    await expect(
      saveJourney(
        h.client,
        h.run.id,
        'EXPLORATION',
        { ...j, rationale: 'changed' },
        1,
        new SecretVault(),
      ),
    ).rejects.toThrow('IMMUTABLE JOURNEY MISMATCH');
  } finally {
    await h.close();
  }
});
