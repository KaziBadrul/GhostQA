import { createServer } from 'node:http';
import next from 'next';
import { readConfig, loadLocalEnvironment } from './src/server/config';
import { createDatabase } from './src/server/db';
import { RunSupervisor } from './src/server/run-supervisor';
loadLocalEnvironment();
const config = readConfig(process.env);
const db = createDatabase(config.databaseUrl);
const client = await db.connect();
const supervisor = await RunSupervisor.acquire(client);
const app = next({
  dev: process.env.NODE_ENV !== 'production',
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
  await supervisor.shutdown();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await app.close();
  client.release();
  await db.end();
}
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
