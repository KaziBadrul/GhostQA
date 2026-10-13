import { expect, test } from 'vitest';
import {
  firstIncompleteStep,
  setupStepStatus,
  type SetupProgress,
} from '../../src/lib/setup-wizard';
const ready: SetupProgress = {
  specification: true,
  target: true,
  credentials: false,
  reset: true,
  invariant: true,
  approved: true,
};
test('returning projects resume at the first missing required step, without requiring credentials', () => {
  expect(
    firstIncompleteStep({
      ...ready,
      specification: false,
      target: false,
      reset: false,
      invariant: false,
      approved: false,
    }),
  ).toBe(0);
  expect(firstIncompleteStep({ ...ready, target: false, reset: false })).toBe(
    1,
  );
  expect(firstIncompleteStep({ ...ready, reset: false })).toBe(3);
  expect(
    firstIncompleteStep({ ...ready, invariant: false, approved: false }),
  ).toBe(4);
  expect(firstIncompleteStep({ ...ready, approved: false })).toBe(4);
  expect(firstIncompleteStep(ready)).toBe(5);
  expect(setupStepStatus(2, ready)).toBe('Optional');
});
test('saving a rule does not claim approval and reviewing does not claim execution', () => {
  expect(setupStepStatus(4, { ...ready, approved: false })).toBe(
    'Needs approval',
  );
  expect(setupStepStatus(5, { ...ready, approved: false })).toBe(
    'Setup incomplete',
  );
  expect(setupStepStatus(5, ready)).toBe('Ready to review');
});
