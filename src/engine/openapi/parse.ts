import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';
import { ApiModelSchema, type ApiModel } from '../contracts';
export async function parseOpenApi(text: string): Promise<ApiModel> {
  if (Buffer.byteLength(text) > 2 * 1024 * 1024)
    throw new Error('IMPORT TOO LARGE');
  return new Promise((resolveModel, reject) => {
    const worker = new Worker(resolve('dist/import-worker.mjs'), {
      workerData: text,
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    });
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new Error('IMPORT TIMEOUT'));
    }, 10000);
    const stop = () => {
      clearTimeout(timer);
      void worker.terminate();
    };
    worker.once('error', () => {
      stop();
      reject(new Error('INVALID OPENAPI'));
    });
    worker.once('message', (value: unknown) => {
      stop();
      const parsed = ApiModelSchema.safeParse(
        value && typeof value === 'object' && 'model' in value
          ? value.model
          : undefined,
      );
      if (!parsed.success) reject(new Error('INVALID OPENAPI'));
      else resolveModel(parsed.data);
    });
  });
}
