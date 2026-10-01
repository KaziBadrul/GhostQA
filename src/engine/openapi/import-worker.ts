import { parentPort, workerData } from 'node:worker_threads';
import { parseDocumentInMemory } from './document';
try {
  if (typeof workerData !== 'string') throw new Error('INVALID OPENAPI');
  const model = await parseDocumentInMemory(workerData);
  parentPort?.postMessage({ model });
} catch {
  parentPort?.postMessage({ error: 'INVALID OPENAPI' });
}
