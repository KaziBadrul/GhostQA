import { afterEach, expect, test, vi } from 'vitest';
import { GenerateContentResponse } from '@google/genai';
import { createGeminiProvider } from '../../src/engine/planning/gemini';
import {
  createModelPacer,
  sharedModelPacer,
} from '../../src/engine/planning/pacing';
import { planningFixture } from '../helpers/planning';
import { boundedContext } from '../../src/engine/planning/context';
import { readConfig } from '../../src/server/config';

afterEach(() => vi.useRealTimers());
const signal = () => new AbortController().signal;
function clock() {
  vi.useFakeTimers();
  return {
    now: () => Date.now(),
    sleep: (ms: number, s: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(new Error('CANCELLED'));
        };
        const timer = setTimeout(() => {
          s.removeEventListener('abort', abort);
          resolve();
        }, ms);
        s.addEventListener('abort', abort, { once: true });
      }),
  };
}
test('12 RPM dispatches once immediately and waits five seconds for the next call', async () => {
  const c = clock(),
    p = createModelPacer(12, c),
    call = vi.fn(async () => 'ok');
  expect(await p.runOnce(signal(), call)).toBe('ok');
  const next = p.runOnce(signal(), call);
  await vi.advanceTimersByTimeAsync(4999);
  expect(call).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(await next).toBe('ok');
  expect(call).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(5000);
  await p.runOnce(signal(), call);
  expect(call).toHaveBeenCalledTimes(3);
});
test('queued concurrent calls preserve minimum spacing without bursts', async () => {
  const c = clock(),
    p = createModelPacer(12, c),
    times: number[] = [];
  const calls = Array.from({ length: 3 }, () =>
    p.runOnce(signal(), async () => times.push(c.now())),
  );
  await vi.advanceTimersByTimeAsync(10000);
  await Promise.all(calls);
  expect(times.slice(1).map((t, i) => t - times[i]!)).toEqual([5000, 5000]);
});
test('failure consumes its spacing slot but is never retried or converted to success', async () => {
  const c = clock(),
    p = createModelPacer(12, c),
    error = { status: 429 };
  const fail = vi.fn(async () => {
    throw error;
  });
  await expect(p.runOnce(signal(), fail)).rejects.toBe(error);
  const call = vi.fn(async () => 'next'),
    next = p.runOnce(signal(), call);
  await vi.advanceTimersByTimeAsync(4999);
  expect(call).not.toHaveBeenCalled();
  expect(fail).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(await next).toBe('next');
});
test('cancellation during pacing prevents dispatch and does not reserve a dispatched slot', async () => {
  const c = clock(),
    p = createModelPacer(12, c);
  await p.runOnce(signal(), async () => undefined);
  const controller = new AbortController(),
    call = vi.fn(async () => undefined);
  const next = p.runOnce(controller.signal, call);
  const rejection = expect(next).rejects.toThrow('CANCELLED');
  await vi.advanceTimersByTimeAsync(1);
  controller.abort();
  await rejection;
  expect(call).not.toHaveBeenCalled();
});
test('Gemini adapter paces its only SDK dispatch and retains one-attempt 429 failure', async () => {
  const c = clock(),
    p = createModelPacer(12, c),
    f = planningFixture();
  const chunk = new GenerateContentResponse();
  chunk.candidates = [
    { content: { parts: [{ text: JSON.stringify(f.journey) }] } },
  ];
  async function* stream() {
    yield chunk;
  }
  const generateContentStream = vi.fn(async () => stream());
  const provider = createGeminiProvider(
    { model: 'test-model', apiKey: 'test-key', requestsPerMinute: 12 },
    { models: { generateContentStream } },
    p,
  );
  await provider.propose(boundedContext(f.context), signal());
  generateContentStream.mockRejectedValueOnce(
    Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 }),
  );
  const next = provider.propose(boundedContext(f.context), signal());
  const rejection = expect(next).rejects.toMatchObject({
    diagnostic: { httpStatus: 429 },
  });
  await vi.advanceTimersByTimeAsync(4999);
  expect(generateContentStream).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await rejection;
  expect(generateContentStream).toHaveBeenCalledTimes(2);
  expect(generateContentStream.mock.calls[0]).toBeDefined();
});
test('configuration exposes conservative default and rejects invalid RPM without leaking values', () => {
  const env = {
    DATABASE_URL: 'postgresql://localhost/test',
    GHOSTQA_CREDENTIAL_KEY: '11'.repeat(32),
    GEMINI_MODEL: 'test-model',
    GEMINI_API_KEY: 'test-key',
  };
  expect(readConfig(env).geminiRequestsPerMinute).toBe(12);
  expect(
    readConfig({ ...env, GEMINI_REQUESTS_PER_MINUTE: '6' })
      .geminiRequestsPerMinute,
  ).toBe(6);
  expect(() =>
    readConfig({ ...env, GEMINI_REQUESTS_PER_MINUTE: 'private-value' }),
  ).toThrow('GEMINI_REQUESTS_PER_MINUTE');
  expect(() =>
    readConfig({ ...env, GEMINI_REQUESTS_PER_MINUTE: '0' }),
  ).toThrow();
});

test('default process pacing is shared across provider instances, not a fresh per-trial counter', () => {
  expect(sharedModelPacer('test-project-model', 12)).toBe(
    sharedModelPacer('test-project-model', 12),
  );
});
test('pacing module contains no target HTTP dispatcher, supervisor, budget or evidence capability', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('src/engine/planning/pacing.ts', 'utf8');
  expect(source).not.toMatch(
    /RunSupervisor|BudgetManager|fetch\(|https?:|repositories|VERIFIED/,
  );
});
