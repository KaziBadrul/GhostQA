import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { startFixture } from '../../fixtures/api/server';
import { accountOperationPolicy } from '../../fixtures/api/control';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import { validInput } from '../../src/engine/openapi/schemas';
import {
  approveScope,
  authorizeOperation,
} from '../../src/engine/policy/scope';
import { explorationOperations } from '../../src/engine/policy/operations';
import { SecretVault } from '../../src/engine/secrets/vault';

// Evaluator-only HTTP calls are outside a GhostQA run and target this local fixture only.
const responseBody = z.record(z.string(), z.json());
async function call(url: string, path: string, method = 'GET', body?: unknown) {
  const response = await fetch(url + path, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    body: responseBody.parse(await response.json()),
  };
}
const acceptanceSchema = z.strictObject({
  scenario: z.string(),
  requiredScenarios: z.array(z.string()),
  faultyStatus: z.number(),
  repairedStatus: z.number(),
  requiredBaseline: z.strictObject({
    accounts: z.number(),
    tokens: z.number(),
  }),
});
for (const repaired of [false, true])
  test(`password change invalidates every outstanding account token, repaired=${repaired}`, async () => {
    expect(acceptance.requiredScenarios).toContain(
      'password-reset-after-password-change',
    );
    const f = await startFixture(repaired);
    try {
      await call(f.url, '/api/control/reset', 'POST');
      expect((await call(f.url, '/api/control/baseline')).body).toEqual(
        acceptance.requiredBaseline,
      );
      const create = async (email: string) =>
        call(f.url, '/api/accounts', 'POST', {
          email,
          password: 'initial-password',
        });
      const account = await create('changed@example.test');
      const other = await create('other@example.test');
      const issue = async (id: unknown) =>
        (await call(f.url, `/api/accounts/${id}/password-reset`, 'POST')).body
          .token;
      const first = await issue(account.body.id),
        second = await issue(account.body.id),
        third = await issue(account.body.id);
      const unaffected = await issue(other.body.id);
      expect(
        (
          await call(f.url, '/api/password-reset', 'POST', {
            token: first,
            password: 'new-password',
          })
        ).status,
      ).toBe(200);
      // Used tokens remain single-use in both variants.
      expect(
        (
          await call(f.url, '/api/password-reset', 'POST', {
            token: first,
            password: 'again',
          })
        ).status,
      ).toBe(403);
      for (const token of [second, third])
        expect(
          (
            await call(f.url, '/api/password-reset', 'POST', {
              token,
              password: 'another-password',
            })
          ).status,
        ).toBe(repaired ? acceptance.repairedStatus : acceptance.faultyStatus);
      expect(
        (
          await call(f.url, '/api/password-reset', 'POST', {
            token: unaffected,
            password: 'other-new-password',
          })
        ).status,
      ).toBe(200);
      // A token issued after the change remains usable.
      const fresh = await issue(account.body.id);
      expect(
        (
          await call(f.url, '/api/password-reset', 'POST', {
            token: fresh,
            password: 'fresh-password',
          })
        ).status,
      ).toBe(200);
    } finally {
      await f.close();
    }
  });
const acceptance = acceptanceSchema.parse(
  JSON.parse(
    await readFile(
      new URL(
        '../../fixtures/private/account-acceptance.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ),
);
for (const repaired of [false, true])
  test(`account fixture repaired=${repaired}`, async () => {
    const f = await startFixture(repaired);
    try {
      expect(await call(f.url, '/api/control/reset', 'POST')).toEqual({
        status: 200,
        body: { reset: true },
      });
      expect((await call(f.url, '/api/control/baseline')).body).toEqual(
        acceptance.requiredBaseline,
      );
      const model = await parseOpenApi(JSON.stringify(f.openapi));
      expect(model.operations.every((o) => o.eligible)).toBe(true);
      const create = {
        email: 'first@example.test',
        password: 'initial-password',
      };
      const createSchema = model.operations.find(
        (o) => o.id === 'POST /api/accounts',
      )!.requestBody!;
      expect(validInput(createSchema, create)).toBe(true);
      const account = await call(f.url, '/api/accounts', 'POST', create);
      expect(account.status).toBe(201);
      const id = z.uuid().parse(account.body.id);
      const reset = await call(
        f.url,
        `/api/accounts/${id}/password-reset`,
        'POST',
      );
      expect(reset.status).toBe(200);
      const token = z.uuid().parse(reset.body.token);
      expect((await call(f.url, '/api/control/baseline')).body).toEqual({
        accounts: 1,
        tokens: 1,
      });
      expect(
        (
          await call(f.url, `/api/accounts/${id}/email`, 'PATCH', {
            email: 'next@example.test',
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await call(f.url, '/api/password-reset', 'POST', {
            token,
            password: 'new-password',
          })
        ).status,
      ).toBe(repaired ? acceptance.repairedStatus : acceptance.faultyStatus);
      expect(
        (
          await call(f.url, '/api/password-reset', 'POST', {
            token,
            password: 'another-password',
          })
        ).status,
      ).toBe(403);
      await call(f.url, '/api/control/reset', 'POST');
      await call(f.url, '/api/control/reset', 'POST');
      expect((await call(f.url, '/api/control/baseline')).body).toEqual(
        acceptance.requiredBaseline,
      );
      expect(
        (
          await call(f.url, '/api/password-reset', 'POST', {
            token,
            password: 'new-password',
          })
        ).status,
      ).toBe(403);
      const newAccount = await call(f.url, '/api/accounts', 'POST', create);
      expect(newAccount.body.id).not.toBe(id);
      const newReset = await call(
        f.url,
        `/api/accounts/${newAccount.body.id}/password-reset`,
        'POST',
      );
      expect(newReset.body.token).not.toBe(token);
      const vault = new SecretVault();
      expect(JSON.stringify(vault.sanitize(reset.body))).not.toContain(token);
      expect(JSON.stringify(f.openapi)).not.toMatch(
        /faulty|repaired|seeded|old token|password-reset-after-email-change/i,
      );
    } finally {
      await f.close();
    }
  });
test('faulty and repaired public contracts and normal reset behavior are identical', async () => {
  const a = await startFixture(false),
    b = await startFixture(true);
  try {
    expect(a.openapi).toEqual(b.openapi);
    for (const f of [a, b]) {
      const account = await call(f.url, '/api/accounts', 'POST', {
        email: 'normal@example.test',
        password: 'first-password',
      });
      const token = await call(
        f.url,
        `/api/accounts/${account.body.id}/password-reset`,
        'POST',
      );
      expect(
        (
          await call(f.url, '/api/password-reset', 'POST', {
            token: token.body.token,
            password: 'second-password',
          })
        ).status,
      ).toBe(200);
    }
  } finally {
    await a.close();
    await b.close();
  }
});
test('fixture scope classifies controls separately and planner projection cannot grant their authority', async () => {
  const f = await startFixture(false);
  try {
    const model = await parseOpenApi(JSON.stringify(f.openapi));
    const scope = approveScope(
      f.url + '/api',
      [{ ip: '127.0.0.1', family: 4 }],
      accountOperationPolicy(),
      true,
      randomUUID(),
    );
    const reset = 'POST /api/control/reset',
      baseline = 'GET /api/control/baseline';
    expect(() => authorizeOperation(scope, reset, 'RESET')).not.toThrow();
    expect(() => authorizeOperation(scope, baseline, 'BASELINE')).not.toThrow();
    for (const id of [reset, baseline]) {
      expect(() => authorizeOperation(scope, id, 'EXPLORATION')).toThrow(
        'OPERATION FORBIDDEN',
      );
      expect(explorationOperations(model, scope).some((o) => o.id === id)).toBe(
        false,
      );
    }
    expect(explorationOperations(model, scope)).toHaveLength(4);
    expect(JSON.stringify(explorationOperations(model, scope))).not.toMatch(
      /control\/|faulty|repaired|seeded|password-reset-after-email-change/,
    );
    expect(() =>
      authorizeOperation(scope, 'POST /api/accounts', 'RESET'),
    ).toThrow('OPERATION FORBIDDEN');
    expect(() =>
      authorizeOperation(scope, 'POST /api/accounts', 'EXPLORATION'),
    ).not.toThrow();
  } finally {
    await f.close();
  }
});
test('malformed fixture requests do not mutate baseline or reveal evaluator state', async () => {
  const f = await startFixture(false);
  try {
    const bad = await fetch(f.url + '/api/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
    });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: 'Invalid input' });
    expect(
      (
        await call(f.url, '/api/accounts', 'POST', {
          email: 4,
          password: 'secret',
        })
      ).status,
    ).toBe(400);
    expect((await call(f.url, '/api/control/baseline')).body).toEqual(
      acceptance.requiredBaseline,
    );
    expect(
      (await call(f.url, '/api/accounts/unknown/password-reset', 'POST'))
        .status,
    ).toBe(404);
  } finally {
    await f.close();
  }
});
test('served OpenAPI contains only the neutral contract', async () => {
  const f = await startFixture(false);
  try {
    const response = await fetch(f.url + '/openapi.json');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(f.openapi);
  } finally {
    await f.close();
  }
});
test('fixture bind failure rejects promptly instead of leaving startup pending', async () => {
  const f = await startFixture(false);
  try {
    await expect(startFixture(true, f.port)).rejects.toThrow('EADDRINUSE');
  } finally {
    await f.close();
  }
});
