import { expect, test } from 'vitest';
import {
  encryptCredential,
  decryptCredential,
} from '../../src/server/credential-store';
import { SecretVault } from '../../src/engine/secrets/vault';
const key = Buffer.alloc(32, 7),
  aad = { projectId: 'project-one', slot: 'bearer', version: 1 };
test('AES-GCM unique nonce and ciphertext; valid authenticated round-trip', () => {
  const a = encryptCredential('secret-value', key, aad),
    b = encryptCredential('secret-value', key, aad);
  expect(a.nonce.equals(b.nonce)).toBe(false);
  expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  expect(decryptCredential(a, key, aad)).toBe('secret-value');
});
test.each(['projectId', 'slot', 'version'] as const)(
  'AAD %s tampering fails closed',
  (field) => {
    const encrypted = encryptCredential('secret-value', key, aad);
    const altered = { ...aad, [field]: field === 'version' ? 2 : 'different' };
    expect(() => decryptCredential(encrypted, key, altered)).toThrow(
      /^CREDENTIAL UNAVAILABLE$/,
    );
  },
);
test.each(['ciphertext', 'authTag', 'nonce'] as const)(
  '%s tampering fails closed',
  (field) => {
    const encrypted = encryptCredential('secret-value', key, aad);
    encrypted[field][0] = (encrypted[field][0] ?? 0) ^ 1;
    expect(() => decryptCredential(encrypted, key, aad)).toThrow(
      /^CREDENTIAL UNAVAILABLE$/,
    );
  },
);
test.each([0, 1, 16, 31, 33])('rejects %i-byte encryption keys', (size) => {
  expect(() =>
    encryptCredential('secret-value', Buffer.alloc(size), aad),
  ).toThrow('INVALID KEY');
});
test('wrong key and malformed payload never return partial/plaintext data', () => {
  const encrypted = encryptCredential('secret-value', key, aad);
  expect(() => decryptCredential(encrypted, Buffer.alloc(32, 8), aad)).toThrow(
    /^CREDENTIAL UNAVAILABLE$/,
  );
  expect(() =>
    decryptCredential({ ...encrypted, authTag: Buffer.alloc(1) }, key, aad),
  ).toThrow(/^CREDENTIAL UNAVAILABLE$/);
});
test('sanitization preserves symbolic equality across designated fields and unexpected echoes', () => {
  const v = new SecretVault();
  const result = v.sanitize({
    token: 'a/b"secret',
    nested: { echo: 'a/b"secret' },
    url: 'https://target/api?token=a%2Fb%22secret',
  });
  const encoded = JSON.stringify(result);
  expect(encoded).not.toContain('secret');
  expect((result as { token: string }).token).toMatch(/^\[SECRET_/);
});
test('default names, custom selectors and bearer suffixes are sensitive', () => {
  const v = new SecretVault(['email']);
  const clean = v.sanitize({
    PASSWORD: 'password-one',
    email: 'private@example.test',
    authorization: 'Bearer abcdef',
  });
  expect(JSON.stringify(clean)).not.toContain('password-one');
  expect(v.sanitize('echo abcdef')).not.toContain('abcdef');
});
test('issued secrets remain trial-local; discard closes vault', () => {
  const v = new SecretVault();
  v.set('issued', 'token', true);
  expect(v.get('issued')).toBe('token');
  v.discard();
  expect(() => v.get('issued')).toThrow('VAULT CLOSED');
});
test('repeated redaction preserves stable symbols and equality across evidence sinks', () => {
  const vault = new SecretVault();
  const first = vault.sanitize({
    authorization: 'Bearer private-token',
    token: 'issued-token',
    echo: 'issued-token',
  });
  expect(vault.sanitize(first, true)).toEqual(first);
  expect(vault.sanitize(vault.sanitize(first, true), true)).toEqual(first);
});
test('raw credentials resembling symbols remain redacted; actual symbol collisions fail closed', () => {
  const vault = new SecretVault();
  vault.register('[SECRET_1]');
  const safe = vault.sanitize({ echo: '[SECRET_1]' });
  expect(JSON.stringify(safe)).not.toContain('[SECRET_1]');
  const symbol = vault.register('new-raw-secret');
  expect(() => vault.register(symbol)).toThrow('SENSITIVE VALUE CONFLICT');
  expect(() => vault.sanitize({ token: symbol })).toThrow(
    'SENSITIVE VALUE CONFLICT',
  );
  expect(() =>
    vault.sanitize({
      url: 'http://local/api?token=' + encodeURIComponent(symbol),
    }),
  ).toThrow('SENSITIVE VALUE CONFLICT');
});
