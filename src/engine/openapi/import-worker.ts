import { parentPort, workerData } from 'node:worker_threads';
import { parseDocumentInMemory } from './document';
try {
  if (
    !workerData ||
    typeof workerData !== 'object' ||
    typeof workerData.text !== 'string'
  )
    throw new Error('INVALID OPENAPI');
  const model = await parseDocumentInMemory(workerData.text);
  parentPort?.postMessage({ model });
} catch {
  parentPort?.postMessage({ error: 'INVALID OPENAPI' });
}
