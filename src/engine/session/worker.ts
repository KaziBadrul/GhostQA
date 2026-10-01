import { parentPort } from 'node:worker_threads';
import { WorkerMessageSchema } from '../contracts/messages';
if (parentPort) {
  parentPort.on('message', (value: unknown) => {
    const message = WorkerMessageSchema.safeParse(value);
    if (!message.success) {
      parentPort?.postMessage({ kind: 'STOPPED', reason: 'INVALID MESSAGE' });
      return;
    }
  });
  parentPort.postMessage({ kind: 'READY' });
}
