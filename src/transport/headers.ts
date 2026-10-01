import { validateHeaderName, validateHeaderValue } from 'node:http';
const reserved = new Set([
  'host',
  'content-length',
  'transfer-encoding',
  'connection',
  'proxy-authorization',
  'proxy-authenticate',
  'proxy-connection',
  'keep-alive',
  'upgrade',
  'te',
  'trailer',
  'accept-encoding',
  'expect',
]);
export function validateHeaders(input: Record<string, string>) {
  const result: Record<string, string> = {};
  let bytes = 0;
  for (const [key, value] of Object.entries(input)) {
    const name = key.toLowerCase();
    if (reserved.has(name) || name.startsWith('proxy-') || name in result)
      throw new Error('RESERVED HEADER');
    try {
      validateHeaderName(name);
      validateHeaderValue(name, value);
    } catch {
      throw new Error('INVALID HEADER');
    }
    bytes += Buffer.byteLength(`${name}: ${value}\r\n`);
    if (bytes > 16384) throw new Error('HEADER LIMIT');
    result[name] = value;
  }
  return result;
}
