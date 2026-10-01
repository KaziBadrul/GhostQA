import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { ObservationSchema } from '../../src/engine/contracts';
import { SecretVault } from '../../src/engine/secrets/vault';
import { summarize } from '../../src/engine/observations/summarize';
function observation(body: unknown) {
  return ObservationSchema.parse({
    id: randomUUID(),
    runId: randomUUID(),
    trialId: randomUUID(),
    stepId: 'inspect',
    result: {
      stepId: 'inspect',
      status: 200,
      sanitizedRequest: {},
      sanitizedResponse: body,
      truncated: false,
      startedAt: new Date().toISOString(),
      elapsedMs: 1,
      outcome: 'RESPONSE',
    },
    stateMappings: [],
  });
}
test('summary redacts unexpectedly echoed registered credentials before provider use', () => {
  const vault = new SecretVault();
  vault.register('private-bearer');
  expect(
    JSON.stringify(
      summarize(
        [observation({ echo: 'private-bearer', token: 'issued-token' })],
        vault,
      ),
    ),
  ).not.toMatch(/private-bearer|issued-token/);
});
test('summary is bounded and refuses oversized context rather than passing it to a model', () =>
  expect(() =>
    summarize(
      [observation({ body: 'x'.repeat(128 * 1024) })],
      new SecretVault(),
    ),
  ).toThrow('CONTEXT TOO LARGE'));
