// Developer-visible example configuration, never supplied to benchmark planners.
const step = (id: string, operationId: string) => ({
  id,
  operationId,
  parameters: [],
  bodyBindings: [],
  extracts: [],
  expectedStatuses: [200],
});
export const exampleReset = {
  resetSteps: [step('reset', 'POST /api/control/reset')],
  checkSteps: [step('baseline', 'GET /api/control/baseline')],
  resetAssertions: [
    {
      op: 'equals',
      left: { kind: 'json', stepId: 'reset', pointer: '/reset' },
      right: { kind: 'literal', value: true },
    },
  ],
  baselineAssertions: [
    {
      op: 'equals',
      left: { kind: 'json', stepId: 'baseline', pointer: '/orders' },
      right: { kind: 'literal', value: 0 },
    },
  ],
};
export const exampleInvariant = {
  sourceRef:
    'An order observed as CANCELLED must not later be FULFILLED in the same fresh trial.',
  applicability: [
    {
      op: 'equals',
      left: { kind: 'json', stepId: 'cancelled', pointer: '/state' },
      right: { kind: 'literal', value: 'CANCELLED' },
    },
    {
      op: 'equals',
      left: { kind: 'json', stepId: 'cancelled', pointer: '/id' },
      right: { kind: 'json', stepId: 'later', pointer: '/id' },
    },
    {
      op: 'before',
      left: { kind: 'step-index', stepId: 'cancelled' },
      right: { kind: 'step-index', stepId: 'later' },
    },
  ],
  assertions: [
    {
      op: 'not-equals',
      left: { kind: 'json', stepId: 'later', pointer: '/state' },
      right: { kind: 'literal', value: 'FULFILLED' },
    },
  ],
};
