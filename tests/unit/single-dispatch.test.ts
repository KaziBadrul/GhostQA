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
    if (path !== 'src/engine/execution/http-executor.ts') {
      expect(text, path).not.toMatch(
        /\bfetch\s*\(|\brequest\s+as\s+\w+\s*}\s*from\s*['"]node:https?['"]/,
      );
    }
  }
  expect(transportImporters).toEqual(['src/server/dispatch.ts']);
});
