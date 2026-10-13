import { expect, test, vi, afterEach } from 'vitest';
const state = vi.hoisted(() => ({
  created: vi.fn(),
  terminate: vi.fn(async () => 0),
}));
vi.mock('node:worker_threads', async () => {
  const { EventEmitter } = await import('node:events');
  return {
    Worker: class extends EventEmitter {
      constructor(path: unknown, options: unknown) {
        super();
        state.created(path, options);
      }
      terminate() {
        return state.terminate();
      }
    },
  };
});
import { parseOpenApi } from '../../src/engine/openapi/parse';
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
test('import deadline terminates bounded worker at ten seconds', async () => {
  vi.useFakeTimers();
  const pending = parseOpenApi('{}');
  const rejection = expect(pending).rejects.toThrow('IMPORT TIMEOUT');
  expect(state.created.mock.calls[0]?.[1]).toMatchObject({
    workerData: { text: '{}' },
    resourceLimits: { maxOldGenerationSizeMb: 128 },
  });
  await vi.advanceTimersByTimeAsync(10000);
  await rejection;
  expect(state.terminate).toHaveBeenCalledTimes(1);
});
test('size limit rejects before worker creation', async () => {
  await expect(parseOpenApi('x'.repeat(2097153))).rejects.toThrow(
    'IMPORT TOO LARGE',
  );
  expect(state.created).not.toHaveBeenCalled();
});
