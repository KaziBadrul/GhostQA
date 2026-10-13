import { build } from 'esbuild';
await build({
  entryPoints: ['src/engine/session/worker.ts'],
  outfile: 'dist/engine-worker.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
});

await build({
  entryPoints: ['src/engine/openapi/import-worker.ts'],
  outfile: 'dist/import-worker.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
});

// Compile the deterministic standalone template once; generation needs no compiler at runtime.
await build({
  entryPoints: ['src/server/mcp/runtime.ts'],
  outfile: 'dist/mcp-runtime.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
});
