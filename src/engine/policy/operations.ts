import type { ApiModel, FrozenScope } from '../contracts';
import { authorizeOperation } from './scope';
export { authorizeOperation } from './scope';
// Context reduction only; dispatcher independently authorizes every execution.
export function explorationOperations(api: ApiModel, scope: FrozenScope) {
  return api.operations.filter((operation) => {
    if (
      !operation.eligible ||
      scope.operationPolicy.find((p) => p.operationId === operation.id)
        ?.category !== 'EXPLORATION'
    )
      return false;
    try {
      authorizeOperation(scope, operation.id, 'EXPLORATION');
      return true;
    } catch {
      return false;
    }
  });
}
