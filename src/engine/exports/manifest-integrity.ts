import { createHash } from 'node:crypto';
import { canonical } from '../detection/predicate';
import { validatePredicate } from '../validation/predicate';
import { validateDependencies } from '../validation/dependencies';
import { ManifestSchema } from './contracts';
import { samePredicate } from '../detection/findings';
import { identity } from '../minimization/deletion';
export function manifestHash(value: unknown): string {
  const manifest = ManifestSchema.parse(value);
  const predicate = validatePredicate(manifest.predicate);
  for (const assertion of [
    ...manifest.reset.resetAssertions,
    ...manifest.reset.baselineAssertions,
  ])
    validatePredicate(assertion.predicate);
  validateDependencies(manifest.journey);
  const slots = manifest.credentialSlots;
  if (
    !samePredicate(manifest.predicateRef, identity(predicate)) ||
    !samePredicate(manifest.journey.predicateRef, identity(predicate)) ||
    canonical(manifest.assertions) !== canonical(predicate.assertions) ||
    new Set(slots).size !== slots.length ||
    canonical(slots) !==
      canonical(manifest.credentialBindings.map((b) => b.slot)) ||
    new Set(manifest.credentialBindings.map((b) => b.name.toLowerCase()))
      .size !== slots.length
  )
    throw new Error('MANIFEST IDENTITY MISMATCH');
  return createHash('sha256').update(canonical(manifest)).digest('hex');
}
