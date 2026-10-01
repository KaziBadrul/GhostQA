import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createRegressionBundle } from '../../src/engine/exports/bundle';
import { ManifestSchema } from '../../src/engine/exports/contracts';
import { manifestHash } from '../../src/engine/exports/manifest-integrity';
const source = (file: string) => readFileSync(file, 'utf8');
function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sources(path)
      : /\.tsx?$/.test(path)
        ? [path]
        : [];
  });
}
test('standalone runner cannot import protected executor or originating dispatch capability', () => {
  const text = source('src/engine/exports/runner.ts');
  expect(text).not.toMatch(/http-executor|from\s+['"][^'"]*server\//);
  expect(text).toContain("from '../../transport/http'");
});
test('neutral transport closure depends only on Node and neutral helpers, with no engine authority', () => {
  for (const file of ['http', 'address', 'headers']) {
    const text = source(`src/transport/${file}.ts`);
    const imports = [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
      (m) => m[1]!,
    );
    expect(
      imports.every(
        (i) => i.startsWith('node:') || ['./address', './headers'].includes(i),
      ),
    ).toBe(true);
    expect(text).not.toMatch(
      /RunSupervisor|BudgetManager|approveScope|authorizeOperation|admitTrial|dispatchIntent|repositories|Gemini|VERIFIED|predicate|runId/,
    );
  }
});
test('only protected GhostQA executor and independent runner instantiate neutral HTTP transport', () => {
  const importers = sources('src').filter((file) =>
    /from\s+['"][^'"]*transport\/http['"]/.test(source(file)),
  );
  expect(importers.sort()).toEqual([
    'src/engine/execution/http-executor.ts',
    'src/engine/exports/runner.ts',
  ]);
});
test('T042 remains supervised and durable final authority checks precede originating socket execution', () => {
  const verifier = source('src/engine/exports/verify.ts'),
    supervisor = source('src/server/run-supervisor.ts'),
    dispatch = source('src/server/dispatch.ts');
  expect(verifier).toContain('establishFreshState');
  expect(verifier).toContain('executeJourney');
  expect(verifier).not.toMatch(/transport\/http|from\s+['"][^'"]*runner/);
  expect(supervisor).toMatch(/from ['"]\.\/dispatch['"]/);
  const consumption = dispatch.indexOf('authority.budget.consume('),
    persistence = dispatch.indexOf('await authority.repository.intent('),
    gate = dispatch.indexOf('authority.assert();', persistence),
    execution = dispatch.indexOf('result = await execute(');
  expect(consumption).toBeGreaterThan(0);
  expect(persistence).toBeGreaterThan(consumption);
  expect(gate).toBeGreaterThan(persistence);
  expect(execution).toBeGreaterThan(gate);
  expect(dispatch.slice(gate, execution)).toContain('authorizeOperation');
});
test('offline bundle excludes protected executor, originating services, database and Gemini', async () => {
  const m = ManifestSchema.parse(
    JSON.parse(
      source(
        'tests/acceptance/t042-order-82fdb889-5b6c-49bf-852f-f1b092cb394a.json',
      ),
    ).generated.manifest,
  );
  const bundle = await createRegressionBundle(m, manifestHash(m));
  expect(bundle.inputs).toContain('src/transport/http.ts');
  expect(bundle.inputs.join('\n')).not.toMatch(
    /http-executor|src\/server\/|planning\/|node_modules\/(?:pg|@google)\//,
  );
});
