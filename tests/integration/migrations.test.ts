import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { isolatedDatabase } from '../helpers/database';
import { migrate } from '../../src/server/migrate';

test('core migration enforces snapshots, one active run, append-only evidence and deletion', async () => {
  const { client, close } = await isolatedDatabase();
  const project = randomUUID(),
    run = randomUUID();
  try {
    await migrate(client, resolve('migrations'));
    await client.query('INSERT INTO projects(id,name) VALUES ($1,$2)', [
      project,
      'test',
    ]);
    await client.query(
      "INSERT INTO runs(id,project_id,immutable_snapshot,status,counters) VALUES ($1,$2,$3,'ACCEPTED',$4)",
      [run, project, { scope: 'frozen' }, { usedRequests: 0 }],
    );
    await expect(
      client.query("UPDATE runs SET immutable_snapshot='{}' WHERE id=$1", [
        run,
      ]),
    ).rejects.toThrow();
    await expect(
      client.query(
        "INSERT INTO runs(id,project_id,immutable_snapshot,status,counters) VALUES ($1,$2,'{}','RUNNING','{}')",
        [randomUUID(), project],
      ),
    ).rejects.toThrow();
    await client.query(
      'INSERT INTO specifications(id,project_id,sanitized_document,sanitized_hash,openapi_version,api_model) VALUES ($1,$2,$3,$4,$5,$6)',
      [randomUUID(), project, {}, 'a'.repeat(64), '3.1.0', {}],
    );
    await expect(
      client.query("UPDATE specifications SET sanitized_hash='changed'"),
    ).rejects.toThrow();
    const columns = await client.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name IN ('observations','evidence','step_records')",
    );
    expect(
      columns.rows.some((c) => /raw|plaintext|token/i.test(c.column_name)),
    ).toBe(false);
    await client.query('DELETE FROM projects WHERE id=$1', [project]);
    expect(
      (await client.query('SELECT count(*)::int AS count FROM runs')).rows[0],
    ).toEqual({ count: 0 });
  } finally {
    await close();
  }
});

test('label migration appends rename history without rewriting original evidence or transitions', async () => {
  const { client, close } = await isolatedDatabase();
  const [project, run, journey, evidence, finding, transition] = Array.from(
    { length: 6 },
    () => randomUUID(),
  );
  try {
    await client.query(
      await readFile(resolve('migrations/001_core.sql'), 'utf8'),
    );
    await client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      project,
      'legacy',
    ]);
    await client.query(
      "INSERT INTO runs(id,project_id,immutable_snapshot,status,counters) VALUES($1,$2,'{}','STOPPED','{}')",
      [run, project],
    );
    await client.query(
      "INSERT INTO journeys(id,run_id,phase,definition,normalized_hash,ordinal) VALUES($1,$2,'EXPLORATION','{}','legacy',1)",
      [journey, run],
    );
    await client.query(
      "INSERT INTO evidence(id,run_id,trial_id,kind,step_refs,evaluation) VALUES($1,$2,$3,'EXPLORATION','[]','{\"outcome\":\"VIOLATED\"}')",
      [evidence, run, randomUUID()],
    );
    await client.query(
      "INSERT INTO findings(id,project_id,run_id,predicate_ref,initial_evidence_id,original_journey_id,current_classification) VALUES($1,$2,$3,'{}',$4,$5,'SUSPICIOUS')",
      [finding, project, run, evidence, journey],
    );
    await client.query(
      "INSERT INTO finding_transitions(id,finding_id,next_classification,evidence_refs,reason) VALUES($1,$2,'SUSPICIOUS',$3,'INITIAL PREDICATE VIOLATION')",
      [transition, finding, JSON.stringify([evidence])],
    );
    const original = (
      await client.query('SELECT * FROM finding_transitions WHERE id=$1', [
        transition,
      ])
    ).rows[0];
    const oldEvidence = (
      await client.query('SELECT * FROM evidence WHERE id=$1', [evidence])
    ).rows[0];
    await client.query(
      await readFile(resolve('migrations/002_observed_violation.sql'), 'utf8'),
    );
    expect(
      (
        await client.query(
          'SELECT current_classification FROM findings WHERE id=$1',
          [finding],
        )
      ).rows[0],
    ).toEqual({ current_classification: 'OBSERVED VIOLATION' });
    expect(
      (
        await client.query('SELECT * FROM finding_transitions WHERE id=$1', [
          transition,
        ])
      ).rows[0],
    ).toEqual(original);
    expect(
      (await client.query('SELECT * FROM evidence WHERE id=$1', [evidence]))
        .rows[0],
    ).toEqual(oldEvidence);
    expect(
      (
        await client.query(
          'SELECT prior_classification,next_classification,evidence_refs FROM finding_transitions WHERE finding_id=$1 AND id<>$2',
          [finding, transition],
        )
      ).rows,
    ).toEqual([
      {
        prior_classification: 'SUSPICIOUS',
        next_classification: 'OBSERVED VIOLATION',
        evidence_refs: [evidence],
      },
    ]);
    await expect(
      client.query(
        "UPDATE findings SET current_classification='SUSPICIOUS' WHERE id=$1",
        [finding],
      ),
    ).rejects.toThrow();
    await expect(
      client.query(
        "UPDATE finding_transitions SET next_classification='CONFIRMED' WHERE id=$1",
        [transition],
      ),
    ).rejects.toThrow('Immutable record');
  } finally {
    await close();
  }
});
