import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers/promises';
import { z } from 'zod';

// Conservative application default below the observed project ceiling (15 RPM).
export const defaultModelRequestsPerMinute = 12;
export const ModelRequestsPerMinuteSchema = z
  .number()
  .int()
  .positive()
  .max(60000);
export interface PacingClock {
  now(): number;
  sleep(milliseconds: number, signal: AbortSignal): Promise<void>;
}
const realClock: PacingClock = {
  now: () => performance.now(),
  sleep: async (ms, signal) => {
    await setTimeout(ms, undefined, { signal });
  },
};
export function createModelPacer(rpm: number, clock: PacingClock = realClock) {
  let spacing = 60000 / ModelRequestsPerMinuteSchema.parse(rpm);
  let lastDispatch = -Infinity;
  let tail: Promise<void> = Promise.resolve();
  return {
    // Shared callers may tighten, but never loosen, an already active ceiling.
    tighten(value: number) {
      spacing = Math.max(
        spacing,
        60000 / ModelRequestsPerMinuteSchema.parse(value),
      );
    },
    async runOnce<T>(
      signal: AbortSignal,
      dispatch: () => Promise<T>,
    ): Promise<T> {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      try {
        await previous;
        if (signal.aborted) throw new Error('CANCELLED');
        while (clock.now() - lastDispatch < spacing) {
          await clock.sleep(spacing - (clock.now() - lastDispatch), signal);
          if (signal.aborted) throw new Error('CANCELLED');
        }
        lastDispatch = clock.now();
        // Exactly one dispatch; success/failure is returned unchanged. No retries.
        return await dispatch();
      } finally {
        release();
      }
    },
  };
}
export type ModelPacer = ReturnType<typeof createModelPacer>;
const shared = new Map<string, ModelPacer>();
export function sharedModelPacer(identity: string, rpm: number): ModelPacer {
  let pacer = shared.get(identity);
  if (!pacer) {
    pacer = createModelPacer(rpm);
    shared.set(identity, pacer);
  } else pacer.tighten(rpm);
  return pacer;
}
