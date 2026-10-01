import { expect, test } from 'vitest';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import { orderConfiguration } from '../../scripts/t035-configuration';
import { buildPlanningContext } from '../../src/engine/planning/context';
import { SecretVault } from '../../src/engine/secrets/vault';
import { evaluatePredicate } from '../../src/engine/detection/predicate';
import type { ValueContext } from '../../src/engine/execution/variables';
import { z } from 'zod';

// Evaluator-only local fixture requests, outside any GhostQA run.
async function call(url: string, path: string, method = 'GET') {
  const response = await fetch(url + path, { method });
  return {
    status: response.status,
    body: z.record(z.string(), z.json()).parse(await response.json()),
  };
}
for (const repaired of [false, true])
  test(`order lifecycle reset, neutral contract and invariant repaired=${repaired}`, async () => {
    const fixture = await startOrderFixture(repaired);
    try {
      expect(
        (await call(fixture.url, '/api/control/reset', 'POST')).body,
      ).toEqual({ reset: true });
      expect((await call(fixture.url, '/api/control/baseline')).body).toEqual({
        orders: 0,
      });
      const config = await orderConfiguration(
        fixture.openapi,
        fixture.url,
        'configured-model',
      );
      expect(config.run.apiSnapshot.operations).toHaveLength(6);
      expect(config.run.apiSnapshot.operations.every((o) => o.eligible)).toBe(
        true,
      );
      const created = await call(fixture.url, '/api/orders', 'POST');
      expect(created.status).toBe(201);
      const id = z.uuid().parse(created.body.id);
      expect((await call(fixture.url, `/api/orders/${id}`)).body.state).toBe(
        'CREATED',
      );
      const cancelled = await call(
        fixture.url,
        `/api/orders/${id}/cancel`,
        'POST',
      );
      expect(cancelled.body).toEqual({ id, state: 'CANCELLED' });
      const attempted = await call(
        fixture.url,
        `/api/orders/${id}/fulfill`,
        'POST',
      );
      expect(attempted.status).toBe(repaired ? 409 : 200);
      const later = await call(fixture.url, `/api/orders/${id}`);
      expect(later.body).toEqual({
        id,
        state: repaired ? 'CANCELLED' : 'FULFILLED',
      });
      const values: ValueContext = {
        vault: new SecretVault(),
        inputs: {},
        results: new Map([
          [
            'cancelled',
            { ...cancelled, ordinal: 0, headers: {}, truncated: false },
          ],
          ['later', { ...later, ordinal: 1, headers: {}, truncated: false }],
        ]),
      };
      const predicate = config.run.predicates[0]!;
      expect(evaluatePredicate(predicate, values)).toBe(
        repaired ? 'SATISFIED' : 'VIOLATED',
      );
      values.results.get('later')!.body = { id: 'other', state: 'FULFILLED' };
      expect(evaluatePredicate(predicate, values)).toBe('NOT APPLICABLE');
      values.results.get('later')!.body = later.body;
      values.results.get('later')!.ordinal = -1;
      expect(evaluatePredicate(predicate, values)).toBe('NOT APPLICABLE');
      values.results.delete('later');
      expect(evaluatePredicate(predicate, values)).toBe('UNEVALUABLE');
      await call(fixture.url, '/api/control/reset', 'POST');
      expect((await call(fixture.url, '/api/control/baseline')).body).toEqual({
        orders: 0,
      });
      expect((await call(fixture.url, `/api/orders/${id}`)).status).toBe(404);
      const fresh = await call(fixture.url, '/api/orders', 'POST');
      expect(fresh.body.id).not.toBe(id);
      expect(
        (
          await call(
            fixture.url,
            `/api/orders/${fresh.body.id}/fulfill`,
            'POST',
          )
        ).body.state,
      ).toBe('FULFILLED');
      const context = buildPlanningContext(
        {
          run: config.run,
          mappings: [],
          observations: [],
          symbolicInputs: {},
          consideredHypothesisHashes: [],
        },
        new SecretVault(),
      );
      expect(context.api.operations).toHaveLength(4);
      expect(JSON.stringify(context)).not.toMatch(
        /control\/|repaired|inconsistent|scenario|trigger|accounts|password/,
      );
    } finally {
      await fixture.close();
    }
  });
test('order fixture variants expose identical neutral public contracts', async () => {
  const first = await startOrderFixture(false),
    second = await startOrderFixture(true);
  try {
    expect(first.openapi).toEqual(second.openapi);
    expect(JSON.stringify(first.openapi)).not.toMatch(
      /cancelled-order-fulfillment|inconsistent|repaired|trigger/,
    );
  } finally {
    await first.close();
    await second.close();
  }
});
