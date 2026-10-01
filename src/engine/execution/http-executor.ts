import { JsonSchema } from '../contracts';
import { createPinnedHttpTransport } from '../../transport/http';
export type { TransportRequest, TransportResult } from '../../transport/http';
// Protected GhostQA execution entry. Only server/dispatch.ts imports this module
// in production; originating authority and durable admission remain in that path.
export function createHttpExecutor(trustedCa?: Buffer) {
  return createPinnedHttpTransport(trustedCa, (text) =>
    JsonSchema.parse(JSON.parse(text)),
  );
}
