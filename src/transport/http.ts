import * as http from 'node:http';
import * as https from 'node:https';
import { isIP } from 'node:net';
import { TLSSocket } from 'node:tls';
export type Json =
  string | number | boolean | null | Json[] | { [key: string]: Json };
import { normalizeIp } from './address';
import { validateHeaders } from './headers';
export interface TransportRequest {
  url: URL;
  address: { ip: string; family: 4 | 6 };
  method: string;
  headers: Record<string, string>;
  body?: Json;
  signal: AbortSignal;
  timeoutMs: number;
}
export interface TransportResult {
  status: number;
  headers: Record<string, string>;
  body: Json | null;
  text: string;
  truncated: boolean;
  elapsedMs: number;
}
// Protocol mechanics only: callers supply an already-authorized pinned request.
// There is no operation admission, execution phase, evidence or status capability.
function decodeJson(text: string): Json {
  const value: unknown = JSON.parse(text);
  const valid = (v: unknown): v is Json =>
    v === null ||
    typeof v === 'string' ||
    typeof v === 'boolean' ||
    (typeof v === 'number' && Number.isFinite(v)) ||
    (Array.isArray(v)
      ? v.every(valid)
      : typeof v === 'object' && v !== null && Object.values(v).every(valid));
  if (!valid(value)) throw new Error('INVALID JSON');
  return value;
}
export function createPinnedHttpTransport(
  trustedCa?: Buffer,
  parseJson: (text: string) => Json = decodeJson,
) {
  return (input: TransportRequest): Promise<TransportResult> => {
    const literal = input.url.hostname.replace(/^\[|\]$/g, '');
    if (isIP(literal) && normalizeIp(literal) !== normalizeIp(input.address.ip))
      return Promise.reject(new Error('PIN MISMATCH'));
    if (input.signal.aborted) return Promise.reject(new Error('CANCELLED'));
    const headers = validateHeaders(input.headers);
    const payload =
      input.body === undefined
        ? undefined
        : Buffer.from(JSON.stringify(input.body));
    if (payload && payload.length > 1048576)
      return Promise.reject(new Error('REQUEST LIMIT'));
    const transportHeaders = {
      ...headers,
      'accept-encoding': 'identity',
      ...(payload
        ? {
            'content-type': headers['content-type'] ?? 'application/json',
            'content-length': String(payload.length),
          }
        : {}),
    };
    if (
      Buffer.byteLength(JSON.stringify(transportHeaders)) +
        Buffer.byteLength(input.url.host) >
      16384
    )
      return Promise.reject(new Error('HEADER LIMIT'));
    return new Promise((resolve, reject) => {
      const started = performance.now();
      let finished = false;
      const cleanup = () => {
        clearTimeout(timer);
        input.signal.removeEventListener('abort', abort);
      };
      const fail = (reason: string) => {
        if (finished) return;
        finished = true;
        cleanup();
        request.destroy();
        reject(new Error(reason));
      };
      const done = (result: TransportResult) => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(result);
      };
      const request = (
        input.url.protocol === 'https:' ? https.request : http.request
      )(
        input.url,
        {
          method: input.method,
          headers: transportHeaders,
          agent: false,
          family: input.address.family,
          maxHeaderSize: 16384,
          lookup: (_host, options, callback) => {
            if (options.all)
              callback(null, [
                { address: input.address.ip, family: input.address.family },
              ]);
            else callback(null, input.address.ip, input.address.family);
          },
          ...(input.url.protocol === 'https:'
            ? {
                rejectUnauthorized: true,
                servername: isIP(input.url.hostname.replace(/^\[|\]$/g, ''))
                  ? undefined
                  : input.url.hostname,
                ...(trustedCa ? { ca: trustedCa } : {}),
              }
            : {}),
        },
        (response) => {
          const encoding = response.headers['content-encoding'];
          if (encoding && encoding !== 'identity') {
            response.destroy();
            fail('UNSUPPORTED COMPRESSION');
            return;
          }
          const responseHeaders: Record<string, string> = {};
          for (const [name, value] of Object.entries(response.headers))
            if (value !== undefined)
              responseHeaders[name] = Array.isArray(value)
                ? value.join(', ')
                : value;
          let bytes = 0;
          const chunks: Buffer[] = [];
          const result = (truncated: boolean) => {
            const text = Buffer.concat(chunks).toString('utf8');
            let body: Json | null = null;
            if (
              !truncated &&
              response.headers['content-type']?.includes('json')
            ) {
              try {
                body = parseJson(text);
              } catch {
                /* Invalid JSON remains bounded text, not parsed evidence. */
              }
            }
            return {
              status: response.statusCode ?? 0,
              headers: responseHeaders,
              body,
              text,
              truncated,
              elapsedMs: performance.now() - started,
            };
          };
          response.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > 1048576) {
              done(result(true));
              response.destroy();
              request.destroy();
            } else chunks.push(chunk);
          });
          response.on('end', () => done(result(false)));
          response.on('error', () => fail('RESPONSE ERROR'));
        },
      );
      const abort = () => fail('CANCELLED');
      const timer = setTimeout(
        () => fail('REQUEST TIMEOUT'),
        Math.max(1, input.timeoutMs),
      );
      input.signal.addEventListener('abort', abort, { once: true });
      request.on('error', () => fail('TRANSPORT ERROR'));
      request.on('socket', (socket) => {
        const send = () => {
          if (finished) return;
          if (
            normalizeIp(socket.remoteAddress ?? '') !==
            normalizeIp(input.address.ip)
          ) {
            fail('PIN MISMATCH');
            return;
          }
          if (socket instanceof TLSSocket && !socket.authorized) {
            fail('TLS IDENTITY ERROR');
            return;
          }
          request.end(payload);
        };
        socket.once(
          input.url.protocol === 'https:' ? 'secureConnect' : 'connect',
          send,
        );
      });
    });
  };
}
