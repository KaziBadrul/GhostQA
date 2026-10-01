import { parseDocument } from 'yaml';
import { JsonSchema } from '../contracts';
import { sanitizeApiModel } from './sanitize';
import { modelDocument } from './model';
// Production callers use parseOpenApi's bounded worker. This in-memory function is also
// exercised directly by compatibility tests so external I/O interception covers real parsing.
export async function parseDocumentInMemory(text: string) {
  if (Buffer.byteLength(text) > 2 * 1024 * 1024)
    throw new Error('IMPORT TOO LARGE');
  const yaml = parseDocument(text, { uniqueKeys: true, merge: false });
  if (yaml.errors.length || yaml.warnings.length)
    throw new Error('INVALID OPENAPI');
  const document = JsonSchema.parse(yaml.toJS({ maxAliasCount: 100 }));
  let count = 0;
  const visit = (value: unknown, depth: number) => {
    if (++count > 100000 || depth > 100) throw new Error('INVALID OPENAPI');
    if (value && typeof value === 'object')
      for (const [key, child] of Object.entries(value)) {
        if (['<<', '__proto__', 'constructor', 'prototype'].includes(key))
          throw new Error('INVALID OPENAPI');
        visit(child, depth + 1);
      }
  };
  visit(document, 0);
  return sanitizeApiModel(await modelDocument(document));
}
