import { canonical } from '../detection/predicate';
import { SecretVault } from '../secrets/vault';
import { sensitiveName } from '../secrets/classify';
import type { Json, Journey, Predicate } from '../contracts';
// Classify actual literal input, not JSON Schema property names or symbolic
// credential bindings. Schemas describing passwords are not credential values.
export function assertExecutableSecretFree(
  value: unknown,
  journeys: Journey[],
  predicates: Predicate[],
  vault: SecretVault,
) {
  const clean = (value: Json) => {
    if (canonical(vault.sanitize(value, true)) !== canonical(value))
      throw new Error('EXPORT SECRET MATERIAL');
  };
  for (const journey of journeys)
    for (const step of journey.steps) {
      if (step.body !== undefined) clean(step.body);
      for (const p of step.parameters)
        if (p.value.kind === 'literal') {
          if (sensitiveName(p.name, vault.selectors))
            throw new Error('EXPORT SECRET LITERAL');
          clean(p.value.value);
        }
      for (const binding of step.bodyBindings)
        if (binding.value.kind === 'literal') clean(binding.value.value);
    }
  for (const predicate of predicates)
    for (const comparison of [
      ...predicate.applicability,
      ...predicate.assertions,
    ])
      for (const operand of [comparison.left, comparison.right])
        if (operand?.kind === 'literal') clean(operand.value);
  // Value matching also detects registered credentials echoed into prose/schema
  // descriptions. Reject rather than rewrite executable meaning or approval.
  clean(canonical(value));
}
