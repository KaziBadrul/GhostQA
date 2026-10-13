import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from 'vitest';

async function sources(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sources(path)));
    else if (/\.tsx?$/.test(path)) files.push(path);
  }
  return files;
}

test('only authoritative dispatcher imports target transport; worker and phase modules have no client', async () => {
  const transportImporters: string[] = [];
  for (const path of await sources('src')) {
    const text = await readFile(path, 'utf8');
    if (/from ['"][^'"]*http-executor['"]/.test(text))
      transportImporters.push(path);
    if (path.startsWith('src/components/')) {
      // Browser polling/import calls the local application, never the target.
      for (const call of text.matchAll(/\bfetch\s*\(([^,]+)/g))
        expect(call[1], path).toMatch(/^[\s]*['"`]\/api\//);
    }
    // Feature 002 explicitly authorizes the exported standalone MCP template.
    // It has no GhostQA run authority and must stay outside run modules.
    if (
      path !== 'src/engine/execution/http-executor.ts' &&
      path !== 'src/server/mcp/runtime.ts'
    ) {
      expect(text, path).not.toMatch(
        /\brequest\s+as\s+\w+\s*}\s*from\s*['"]node:https?['"]/,
      );
    }
  }
  for (const directory of [
    'src/engine',
    'src/server',
    'src/cli',
    'src/app/api',
  ]) {
    for (const path of await sources(directory)) {
      if (path !== 'src/engine/execution/http-executor.ts')
        expect(await readFile(path, 'utf8'), path).not.toMatch(/\bfetch\s*\(/);
    }
  }
  expect(transportImporters).toEqual(['src/server/dispatch.ts']);
  for (const directory of ['src/engine', 'src/cli', 'src/server']) {
    for (const path of await sources(directory)) {
      if (!path.startsWith('src/server/mcp/')) {
        expect(await readFile(path, 'utf8'), path).not.toMatch(
          /from\s*['"][^'"]*mcp\/(?:runtime|generator)['"]/,
        );
      }
    }
  }
});
