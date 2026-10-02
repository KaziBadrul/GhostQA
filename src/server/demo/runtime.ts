// Indirection between the browser-facing application surface and the engine
// orchestration. Types only are re-exported here; the implementations are
// installed by `server.ts` at process start.
//
// `src/server/demo/engine` statically reaches the engine's regression-bundle
// builder, which imports esbuild and resolves a repository-root URL at build
// time only. That path must not be pulled into an application bundle, so the
// application imports this module and the real orchestration is registered at
// runtime by the same Node process that already runs the engine.
import type {
  DemoFixtureId,
  DemoRunRecord,
} from './contracts';

export interface DemoEngine {
  startDemoRun(fixtureId: DemoFixtureId): Promise<DemoRunRecord>;
  demoRunDetail(id: string): Promise<DemoRunRecord | undefined>;
  demoRunList(): Promise<{
    activeRunId: string | null;
    runs: DemoRunRecord[];
  }>;
}

const GLOBAL = globalThis as unknown as { __ghostqaDemoEngineInstalled?: DemoEngine };

export function installDemoEngine(engine: DemoEngine) {
  GLOBAL.__ghostqaDemoEngineInstalled = engine;
}

function engine(): DemoEngine {
  const installed = GLOBAL.__ghostqaDemoEngineInstalled;
  if (!installed)
    throw new Error(
      'Demo engine unavailable: the application server did not install the engine runtime.',
    );
  return installed;
}

export const startDemoRun = (fixture: DemoFixtureId) => engine().startDemoRun(fixture);
export const demoRunDetail = (id: string) => engine().demoRunDetail(id);
export const demoRunList = () => engine().demoRunList();

export type { DemoFixtureId, DemoRunRecord };