import { expect, test } from 'vitest';
import { BudgetManager, defaultLimits } from '../../src/engine/budget/manager';
import type { Phase } from '../../src/engine/contracts';
test('defaults are finite and full admission never charges requests', () => {
  const b = new BudgetManager();
  b.admitTrial(1, 1, 4, 'EXPLORATION');
  expect(b.snapshot().usedRequests).toBe(0);
  expect(defaultLimits).toEqual({
    requests: 200,
    milliseconds: 600000,
    journeys: 20,
    steps: 10,
    requestTimeoutMs: 10000,
    modelTimeoutMs: 30000,
  });
});
test('short-by-one rejects before reset', () => {
  const b = new BudgetManager({ ...defaultLimits, requests: 5 });
  expect(() => b.admitTrial(1, 1, 4, 'EXPLORATION')).toThrow(
    'BUDGET EXHAUSTED',
  );
  expect(b.snapshot().usedRequests).toBe(0);
});
test.each([
  'RESET',
  'BASELINE',
  'EXPLORATION',
  'REPLAY',
  'MINIMIZATION',
  'ARTIFACT',
] as Phase[])('each dispatched %s request is charged', (phase) => {
  const b = new BudgetManager();
  b.consume(phase);
  expect(b.snapshot().usedRequests).toBe(1);
  expect(b.snapshot().requestsByPhase[phase]).toBe(1);
});
test('failed requests cannot refund consumption', () => {
  const b = new BudgetManager({ ...defaultLimits, requests: 1 });
  b.consume('RESET');
  expect(() => b.consume('REPLAY')).toThrow('BUDGET EXHAUSTED');
});
test('exploration limit permits follow-up trials', () => {
  const b = new BudgetManager({ ...defaultLimits, journeys: 1 });
  b.admitTrial(1, 1, 1, 'EXPLORATION');
  expect(() => b.admitTrial(1, 1, 1, 'EXPLORATION')).toThrow('JOURNEY LIMIT');
  expect(() => b.admitTrial(1, 1, 1, 'REPLAY')).not.toThrow();
});
test('monotonic hard deadline bounds every request/model timeout', () => {
  let time = 0;
  const b = new BudgetManager(
    { ...defaultLimits, milliseconds: 50 },
    () => time,
  );
  time = 40;
  expect(b.timeout('request')).toBe(10);
  expect(b.timeout('model')).toBe(10);
  time = 50;
  expect(() => b.consume('RESET')).toThrow('TIME EXHAUSTED');
});
test('cancellation permanently prevents admission and consumption', () => {
  const b = new BudgetManager();
  b.stop('CANCELLED');
  expect(() => b.admitTrial(1, 1, 1, 'EXPLORATION')).toThrow('CANCELLED');
  expect(() => b.consume('RESET')).toThrow('CANCELLED');
});
test.each([
  [11, 1, 1],
  [1, 11, 1],
  [1, 1, 11],
  [1, 1, 0],
])('bounded reset/check/journey lengths', (r, c, j) => {
  expect(() =>
    new BudgetManager().admitTrial(r, c, j, 'EXPLORATION'),
  ).toThrow();
});
