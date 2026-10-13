// Shared defaults; only the engine BudgetManager authorizes budget consumption.
export const defaultLimits = Object.freeze({
  requests: 200,
  milliseconds: 600000,
  journeys: 20,
  steps: 10,
  requestTimeoutMs: 10000,
  modelTimeoutMs: 30000,
});
