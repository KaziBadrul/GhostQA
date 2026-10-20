import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'tests/acceptance/**/regression.mjs',
    '.agents/**',
    '.codex/**',
    '.specify/**',
    '.impeccable/**',
    'next-env.d.ts',
  ]),
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
]);
