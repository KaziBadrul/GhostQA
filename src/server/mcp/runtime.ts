// Exported as runtime.mjs. No GhostQA run authority or model access exists here.
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export interface ToolDefinition {
  name: string;
  description: string;
  method: string;
  path: string;
  parameters: { name: string; in: 'path' | 'query'; explode: boolean }[];
  inputSchema: Record<string, unknown>;
  responses?: unknown;
}
export interface Manifest {
  name: string;
  baseUrl: string;
  openapiVersion: string;
  auth: { type: 'none' | 'bearer' | 'apiKey'; header?: string };
  tools: ToolDefinition[];
  importantNotes: { title: string; detail: string }[];
}
const LIMIT = 1024 * 1024;
const TIMEOUT = 10000;
function segment(value: string): string {
  // Reject recursively encoded separators/traversal, including double encoding.
  let decoded = value;
  for (let i = 0; i < 8; i++) {
    if (
      /[/\\\u0000-\u001f\u007f]/.test(decoded) ||
      decoded === '.' ||
      decoded === '..'
    )
      throw new Error('INVALID PATH');
    if (!/%[0-9a-f]{2}/i.test(decoded)) return value;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      throw new Error('INVALID PATH');
    }
  }
  throw new Error('INVALID PATH');
}
export function configuredDestination(value: string) {
  // Check raw path before URL's dot-segment normalization.
  if (!/^https?:\/\//.test(value) || /[\\\s\u0000-\u001f]/.test(value))
    throw new Error('INVALID DESTINATION');
  const rawPath = value.replace(/^https?:\/\/[^/]+/, '');
  for (const part of rawPath.split('/').filter(Boolean)) segment(part);
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('INVALID DESTINATION');
  return url;
}
export function createExecutor(
  manifest: Manifest,
  environment: Record<string, string | undefined> = process.env,
) {
  const base = configuredDestination(manifest.baseUrl);
  const validator = manifest.openapiVersion.startsWith('3.1.')
    ? new Ajv2020({
        strict: false,
        allErrors: false,
        validateFormats: true,
        logger: false,
      })
    : new Ajv({
        strict: false,
        allErrors: false,
        validateFormats: true,
        logger: false,
      });
  addFormats(validator);
  const tools = new Map(
    manifest.tools.map((tool) => [
      tool.name,
      { tool, validate: validator.compile(tool.inputSchema) },
    ]),
  );
  const credential =
    manifest.auth.type === 'bearer'
      ? environment.API_BEARER_TOKEN
      : manifest.auth.type === 'apiKey'
        ? environment.API_KEY
        : undefined;
  if (
    manifest.auth.type !== 'none' &&
    (!credential || !/^[\x20-\x7e]{1,8192}$/.test(credential))
  )
    throw new Error('Missing or invalid authentication environment variable');
  const redact = (text: string) => {
    if (!credential) return text;
    return text
      .split(JSON.stringify(credential).slice(1, -1))
      .join('[REDACTED]')
      .split(credential)
      .join('[REDACTED]');
  };
  return async (
    name: string,
    argumentsValue: unknown,
    signal?: AbortSignal,
  ) => {
    const definition = tools.get(name);
    if (!definition)
      return failure('UNKNOWN TOOL: list tools and use a selected tool name.');
    if (signal?.aborted) return failure('CANCELLED: no request was sent.');
    // Serialization and validation happen before constructing any target request.
    let serialized: string;
    try {
      serialized = JSON.stringify(argumentsValue);
    } catch {
      return failure('INVALID INPUT: use JSON arguments.');
    }
    if (
      !serialized ||
      Buffer.byteLength(serialized) > LIMIT ||
      !definition.validate(argumentsValue)
    )
      return failure(
        'INVALID INPUT: check the tool input schema. No request was sent.',
      );
    const args = argumentsValue as Record<string, unknown>;
    let url: URL;
    let body: string | undefined;
    try {
      const pathValues = (args.path ?? {}) as Record<string, unknown>;
      const queryValues = (args.query ?? {}) as Record<string, unknown>;
      const path = definition.tool.path.replace(
        /\{([^}]+)\}/g,
        (_, key: string) => {
          const value = String(pathValues[key]);
          segment(value);
          return encodeURIComponent(value).replace(
            /[!'()*]/g,
            (char) => '%' + char.charCodeAt(0).toString(16),
          );
        },
      );
      if (
        !path.startsWith('/') ||
        path.includes('{') ||
        path.includes('}') ||
        /[?#\\]/.test(path)
      )
        throw new Error('INVALID PATH');
      for (const part of path.split('/').filter(Boolean)) segment(part);
      const prefix = base.pathname.replace(/\/$/, '');
      url = new URL(base.origin + prefix + path);
      if (url.origin !== base.origin || !url.pathname.startsWith(prefix + '/'))
        throw new Error('INVALID PATH');
      for (const parameter of definition.tool.parameters.filter(
        (p) => p.in === 'query',
      )) {
        const value = queryValues[parameter.name];
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          if (parameter.explode)
            for (const item of value)
              url.searchParams.append(parameter.name, String(item));
          else
            url.searchParams.append(
              parameter.name,
              value.map(String).join(','),
            );
        } else url.searchParams.append(parameter.name, String(value));
      }
      if (Object.hasOwn(args, 'body')) body = JSON.stringify(args.body);
      if (
        Buffer.byteLength(url.href) > 8192 ||
        (body && Buffer.byteLength(body) > LIMIT)
      )
        throw new Error('REQUEST LIMIT');
    } catch {
      return failure(
        'INVALID INPUT: path values cannot contain traversal or separators. No request was sent.',
      );
    }
    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      headers['content-length'] = String(Buffer.byteLength(body));
    }
    if (credential && manifest.auth.type === 'bearer')
      headers.authorization = 'Bearer ' + credential;
    if (credential && manifest.auth.type === 'apiKey')
      headers[manifest.auth.header!] = credential;
    return new Promise<ReturnType<typeof failure>>((resolve) => {
      let settled = false;
      const finish = (result: ReturnType<typeof failure>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };
      const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
        url,
        {
          method: definition.tool.method,
          headers,
          signal,
          ...(url.protocol === 'https:' ? { rejectUnauthorized: true } : {}),
          // Node defaults preserve hostname, SNI and certificate verification.
        },
        (response) => {
          const status = response.statusCode ?? 0;
          if (status >= 300 && status < 400) {
            finish(
              failure(
                'REDIRECT REJECTED: check the configured base URL. No redirect was followed.',
              ),
            );
            response.destroy();
            return;
          }
          if (status < 200 || status >= 300) {
            finish(
              failure(
                'API HTTP ' +
                  status +
                  ': check authentication, inputs and API state. No automatic retry; mutations may have applied.',
              ),
            );
            response.destroy();
            return;
          }
          const chunks: Buffer[] = [];
          let bytes = 0;
          response.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > LIMIT) {
              finish(
                failure(
                  'RESPONSE LIMIT: response exceeded 1 MiB. Target effects may have occurred.',
                ),
              );
              response.destroy();
              request.destroy();
              return;
            }
            chunks.push(chunk);
          });
          response.once('error', () =>
            finish(
              failure(
                'EXECUTION ERROR: response interrupted; target effects may have occurred.',
              ),
            ),
          );
          response.once('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            let value: unknown = null;
            try {
              if (text) value = JSON.parse(text);
            } catch {
              finish(
                failure(
                  'UNSUPPORTED RESPONSE: expected JSON; target effects may have occurred.',
                ),
              );
              return;
            }
            finish({
              content: [
                {
                  type: 'text',
                  text: redact(JSON.stringify({ status, body: value })),
                },
              ],
            });
          });
        },
      );
      const timer = setTimeout(() => {
        finish(
          failure(
            'TIMEOUT: request exceeded 10 seconds; target effects may have occurred. Check API state before retrying.',
          ),
        );
        request.destroy();
      }, TIMEOUT);
      request.once('error', () =>
        finish(
          failure(
            signal?.aborted
              ? 'CANCELLED: target effects may have occurred.'
              : 'EXECUTION ERROR: connection failed; target effects may have occurred. Check API state before retrying.',
          ),
        ),
      );
      request.end(body);
    });
  };
}
function failure(text: string): {
  isError?: boolean;
  content: { type: 'text'; text: string }[];
} {
  return { isError: true, content: [{ type: 'text', text }] };
}
