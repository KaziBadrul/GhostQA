import {
  OperationPolicySchema,
  type FrozenScope,
} from '../../src/engine/contracts';
import type { Accounts } from './account';
export function control(accounts: Accounts, method: string, path: string) {
  if (path === '/api/control/reset' && method === 'POST') {
    accounts.reset();
    return { status: 200, body: { reset: true } };
  }
  if (path === '/api/control/baseline' && method === 'GET')
    return {
      status: 200,
      body: { accounts: accounts.accounts.size, tokens: accounts.tokens.size },
    };
}

// Explicit developer/evaluator configuration; public descriptions never authorize controls.
export function accountOperationPolicy(): FrozenScope['operationPolicy'] {
  return OperationPolicySchema.parse([
    {
      operationId: 'POST /api/control/reset',
      category: 'RESET',
      phases: ['RESET'],
    },
    {
      operationId: 'GET /api/control/baseline',
      category: 'BASELINE',
      phases: ['BASELINE'],
    },
    ...[
      'POST /api/accounts',
      'POST /api/accounts/{accountId}/password-reset',
      'PATCH /api/accounts/{accountId}/email',
      'POST /api/password-reset',
    ].map((operationId) => ({
      operationId,
      category: 'EXPLORATION',
      phases: ['EXPLORATION', 'REPLAY', 'MINIMIZATION', 'ARTIFACT'],
    })),
  ]);
}
