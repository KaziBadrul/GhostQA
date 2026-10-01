import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { isolatedDatabase } from '../helpers/database';
import { migrate } from '../../src/server/migrate';
import { PredicateSchema } from '../../src/engine/contracts';
import { predicateHash } from '../../src/engine/detection/predicate';
import { eligiblePredicate } from '../../src/engine/validation/predicate';
import { SecretVault } from '../../src/engine/secrets/vault';
import {
  savePredicate,
  loadPredicate,
  approvePredicate,
  loadPredicateApproval,
} from '../../src/server/repositories/predicates';
function make() {
  const logic = {
    applicability: [],
    assertions: [
      {
        op: 'equals' as const,
        left: { kind: 'status' as const, stepId: 'use' },
        right: { kind: 'literal' as const, value: 403 },
      },
    ],
  };
  return PredicateSchema.parse({
    id: randomUUID(),
    version: 1,
    canonicalHash: predicateHash(logic),
    source: 'AGENT_HYPOTHESIS',
    sourceRef: 'hypothesis',
    ...logic,
  });
}
const ref = (p: ReturnType<typeof make>) => ({
  id: p.id,
  version: p.version,
  hash: p.canonicalHash,
});
test('predicate versions remain immutable; approvals bind project identity version and semantics', async () => {
  const { client, close } = await isolatedDatabase();
  const project = randomUUID(),
    other = randomUUID();
  try {
    await migrate(client, resolve('migrations'));
    for (const id of [project, other])
      await client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
        id,
        'predicate-test',
      ]);
    const p = make();
    await savePredicate(client, project, p, new SecretVault());
    expect(await loadPredicate(client, project, ref(p))).toEqual(p);
    const approval = await approvePredicate(client, project, ref(p));
    p.approvalRef = approval;
    expect(
      eligiblePredicate(
        p,
        await loadPredicateApproval(client, project, ref(p), approval),
      ),
    ).toBe(true);
    const persisted = await loadPredicate(client, project, ref(p));
    expect(persisted.approvalRef).toBeUndefined();
    await expect(
      client.query("UPDATE predicates SET definition='{}' WHERE id=$1", [p.id]),
    ).rejects.toThrow('Immutable record');
    await expect(
      client.query("UPDATE approvals SET subject_hash='changed' WHERE id=$1", [
        approval,
      ]),
    ).rejects.toThrow('Immutable record');
    await expect(loadPredicate(client, other, ref(p))).rejects.toThrow(
      'PREDICATE NOT FOUND',
    );
    await expect(
      loadPredicate(client, project, { ...ref(p), hash: 'b'.repeat(64) }),
    ).rejects.toThrow('PREDICATE NOT FOUND');
    const v2 = {
      ...persisted,
      version: 2,
      assertions: [
        {
          ...persisted.assertions[0]!,
          right: { kind: 'literal' as const, value: 401 },
        },
      ],
    };
    v2.canonicalHash = predicateHash(v2);
    await savePredicate(client, project, v2, new SecretVault());
    expect(
      (await loadPredicateApproval(client, project, ref(v2), approval)).size,
    ).toBe(0);
    const v3 = { ...v2, version: 3 };
    await savePredicate(client, project, v3, new SecretVault());
    expect(
      (await loadPredicateApproval(client, project, ref(v3), approval)).size,
    ).toBe(0);
    const otherPredicate = make();
    await savePredicate(client, project, otherPredicate, new SecretVault());
    expect(
      (
        await loadPredicateApproval(
          client,
          project,
          ref(otherPredicate),
          approval,
        )
      ).size,
    ).toBe(0);
    const otherProject = make();
    await savePredicate(client, other, otherProject, new SecretVault());
    expect(
      (await loadPredicateApproval(client, other, ref(otherProject), approval))
        .size,
    ).toBe(0);
    await expect(
      savePredicate(
        client,
        project,
        { ...persisted, version: 5 },
        new SecretVault(),
      ),
    ).rejects.toThrow('INVALID PREDICATE VERSION');
    await expect(
      savePredicate(client, project, p, new SecretVault()),
    ).rejects.toThrow('APPROVAL STORED SEPARATELY');
  } finally {
    await close();
  }
});
test('raw secret literals and invalid hashes cannot enter predicate persistence', async () => {
  const { client, close } = await isolatedDatabase();
  try {
    await migrate(client, resolve('migrations'));
    const project = randomUUID();
    await client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      project,
      'test',
    ]);
    const p = make();
    const vault = new SecretVault();
    vault.register('private-credential');
    p.assertions[0]!.right = { kind: 'literal', value: 'private-credential' };
    p.canonicalHash = predicateHash(p);
    await expect(savePredicate(client, project, p, vault)).rejects.toThrow(
      'SECRET PREDICATE LITERAL',
    );
    await expect(
      savePredicate(
        client,
        project,
        { ...p, canonicalHash: 'a'.repeat(64) },
        vault,
      ),
    ).rejects.toThrow('PREDICATE HASH MISMATCH');
    expect(
      (await client.query('SELECT count(*)::int AS count FROM predicates'))
        .rows[0],
    ).toEqual({ count: 0 });
  } finally {
    await close();
  }
});
