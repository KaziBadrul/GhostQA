import { randomUUID } from 'node:crypto';
import type { Journey } from '../../src/engine/contracts';
export function makeJourney(operationId = 'GET /api/item'): Journey {
  return {
    id: randomUUID(),
    steps: [
      {
        id: 'inspect',
        operationId,
        parameters: [],
        bodyBindings: [],
        extracts: [],
        expectedStatuses: [200],
      },
    ],
    variables: [],
    dependencies: [],
    predicateRef: { id: randomUUID(), version: 1, hash: 'a'.repeat(64) },
    rationale: '',
  };
}
