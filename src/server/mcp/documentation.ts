import type { Json } from '../../engine/contracts';
import { SecretVault } from '../../engine/secrets/vault';

// Known configured secrets must never enter model notes or package documentation.
// Arbitrary unmarked secrets cannot be identified perfectly; the wizard forbids entering them.
export function documentationVault(
  environment: Record<string, string | undefined> = process.env,
) {
  const vault = new SecretVault();
  for (const name of [
    'GEMINI_API_KEY',
    'GHOSTQA_CREDENTIAL_KEY',
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'GHOSTQA_ADMIN_PASSWORD',
    'API_BEARER_TOKEN',
    'API_KEY',
  ]) {
    const value = environment[name];
    if (value) vault.register(value);
  }
  return vault;
}
export function assertSafeDocumentation(value: Json) {
  const vault = documentationVault();
  try {
    if (JSON.stringify(vault.sanitize(value)) !== JSON.stringify(value))
      throw new Error('SECRET IN DOCUMENTATION');
  } finally {
    vault.discard();
  }
}
