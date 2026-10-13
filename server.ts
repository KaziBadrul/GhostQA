export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createServer } from 'node:http';
import next from 'next';
import { resolve } from 'node:path';
import { readConfig, loadLocalEnvironment } from './src/server/config';
import { createDatabase } from './src/server/db';
import { migrate } from './src/server/migrate';

loadLocalEnvironment();
const config = readConfig(process.env);
const db = createDatabase(config.databaseUrl);
const client = await db.connect();
try {
  await migrate(client, resolve('migrations'));
} catch (error) {
  client.release();
  await db.end();
  throw error;
}
client.release();

// The engine orchestration is loaded here, in the Node process that already runs
// GhostQA, and handed to the application surface through a runtime registry, so
// route handlers never statically reach the engine's build-time-only
// regression-bundle path.
const { demoEngine } = await import('./src/server/demo/engine');
const { installDemoEngine } = await import('./src/server/demo/runtime');
installDemoEngine(demoEngine);
const { createApplication } = await import('./src/server/application-engine');
const { installApplication } = await import('./src/server/application-runtime');
const applicationEngine = createApplication();
await applicationEngine.recover();
installApplication(applicationEngine);

const app = next({
  dev: process.env.NODE_ENV !== 'production',
  // Webpack in dev as well as build: `npm run build` already uses
  // `next build --webpack`, and this keeps dev and production on one bundler.
  webpack: true,
  hostname: config.hostname,
  port: 3000,
});
await app.prepare();
const handler = app.getRequestHandler();
const server = createServer((request, response) => {
  void handler(request, response);
});
server.listen(3000, config.hostname);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const enginesStopped = Promise.all([
    applicationEngine.shutdown(),
    demoEngine.shutdown(),
  ]);
  await new Promise<void>((done) => server.close(() => done()));
  await enginesStopped;
  await app.close();
  await db.end();
}
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
