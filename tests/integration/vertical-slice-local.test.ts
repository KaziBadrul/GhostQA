import { randomUUID } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { makeRun } from '../helpers/run';
const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  shutdown: vi.fn(),
  cancel: vi.fn(),
  acquire: vi.fn(),
  explore: vi.fn(),
}));
vi.mock('../../src/server/run-supervisor', () => ({
  RunSupervisor: { acquire: mocks.acquire },
}));
vi.mock('../../src/engine/session/explore', () => ({ explore: mocks.explore }));
import {
  runVerticalSlice,
  VerticalSliceConfiguration,
} from '../../src/cli/vertical-slice';

function setup(approved = true) {
  const run = makeRun(randomUUID());
  const client = {
    query: vi.fn(async () => ({ rowCount: approved ? 1 : 0, rows: [] })),
  } as unknown as PoolClient;
  mocks.acquire.mockReset().mockResolvedValue({
    accept: mocks.accept,
    shutdown: mocks.shutdown,
    cancel: mocks.cancel,
  });
  mocks.accept.mockReset().mockResolvedValue(undefined);
  mocks.shutdown.mockReset().mockResolvedValue(undefined);
  mocks.explore
    .mockReset()
    .mockResolvedValue({ stopReason: 'JOURNEY LIMIT', trials: [] });
  return { run, client, provider: { propose: vi.fn() } };
}
test('CLI composition requires exact stored scope approval and reuses supervisor/explore/provider', async () => {
  const { run, client, provider } = setup();
  const before = process.listenerCount('SIGINT');
  expect(await runVerticalSlice(client, run, provider, {})).toEqual({
    stopReason: 'JOURNEY LIMIT',
    trials: [],
  });
  expect(mocks.acquire).toHaveBeenCalledWith(client, undefined);
  expect(mocks.accept).toHaveBeenCalledWith(run);
  expect(mocks.explore).toHaveBeenCalledWith(
    await mocks.acquire.mock.results[0]!.value,
    provider,
    {},
  );
  expect(mocks.shutdown).toHaveBeenCalledOnce();
  expect(provider.propose).not.toHaveBeenCalled();
  expect(process.listenerCount('SIGINT')).toBe(before);
});
test('missing scope approval prevents acquiring a supervisor or invoking the provider', async () => {
  const { run, client, provider } = setup(false);
  await expect(runVerticalSlice(client, run, provider, {})).rejects.toThrow(
    'SCOPE APPROVAL REQUIRED',
  );
  expect(mocks.acquire).not.toHaveBeenCalled();
  expect(provider.propose).not.toHaveBeenCalled();
});
test('failed acceptance shuts down ownership without exploration', async () => {
  const { run, client, provider } = setup();
  mocks.accept.mockRejectedValueOnce(new Error('SECRET IN RUN SNAPSHOT'));
  await expect(runVerticalSlice(client, run, provider, {})).rejects.toThrow(
    'SECRET IN RUN SNAPSHOT',
  );
  expect(mocks.explore).not.toHaveBeenCalled();
  expect(mocks.shutdown).toHaveBeenCalledOnce();
});
test('CLI configuration rejects unknown authority fields and any canned journey', () => {
  const { run } = setup();
  expect(() =>
    VerticalSliceConfiguration.parse({ run, journey: [], phase: 'RESET' }),
  ).toThrow();
});
