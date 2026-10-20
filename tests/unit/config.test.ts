import { expect, test } from 'vitest';
import { databaseConnectionString, readConfig } from '../../src/server/config';

const valid = {
  DATABASE_URL: 'postgresql://localhost/ghostqa',
  GHOSTQA_CREDENTIAL_KEY: '11'.repeat(32),
  GEMINI_MODEL: 'configured-model',
  GEMINI_API_KEY: 'provider-secret',
};
test('validates explicit model and separate credential key', () => {
  expect(readConfig(valid).geminiModel).toBe('configured-model');
});
test('uses the direct Neon connection for supervisor sessions and migrations', () => {
  const direct = 'postgresql://direct.example/ghostqa?sslmode=verify-full';
  const input = { ...valid, DATABASE_URL_UNPOOLED: direct };
  expect(readConfig(input).databaseUrl).toBe(direct);
  expect(databaseConnectionString(input)).toBe(direct);
  expect(databaseConnectionString(valid)).toBe(valid.DATABASE_URL);
});
test('invalid direct connections fail closed without leaking values or falling back', () => {
  const input = { ...valid, DATABASE_URL_UNPOOLED: 'private-secret' };
  expect(() => readConfig(input)).toThrow(
    /^Invalid application configuration: DATABASE_URL_UNPOOLED$/,
  );
  expect(() => databaseConnectionString(input)).toThrow(
    /^Invalid database connection configuration$/,
  );
});
test.each([
  'DATABASE_URL',
  'GHOSTQA_CREDENTIAL_KEY',
  'GEMINI_MODEL',
  'GEMINI_API_KEY',
])('rejects missing %s', (key) => {
  const input: Record<string, string> = { ...valid };
  delete input[key];
  expect(() => readConfig(input)).toThrow('Invalid application configuration');
});
test.each(['', 'a', '11'.repeat(31), 'xx'.repeat(32)])(
  'rejects malformed key',
  (key) => {
    expect(() => readConfig({ ...valid, GHOSTQA_CREDENTIAL_KEY: key })).toThrow(
      'Invalid application configuration',
    );
  },
);
test('errors do not disclose environment values', () => {
  expect(() =>
    readConfig({ ...valid, DATABASE_URL: 'private-secret' }),
  ).toThrow(/^Invalid application configuration: DATABASE_URL$/);
});

test('configuration reports only invalid variable names, never their values', () => {
  try {
    readConfig({
      ...valid,
      DATABASE_URL: 'private-secret',
      GEMINI_API_KEY: '',
    });
  } catch (error) {
    expect((error as Error).message).toContain('DATABASE_URL');
    expect((error as Error).message).toContain('GEMINI_API_KEY');
    expect((error as Error).message).not.toContain('private-secret');
  }
});
