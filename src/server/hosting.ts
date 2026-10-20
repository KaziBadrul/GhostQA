import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface HostingConfig {
  readonly hostname: '127.0.0.1' | '0.0.0.0';
  readonly port: number;
  readonly publicOrigin?: string;
  readonly password?: string;
}

export function readHostingConfig(
  env: Record<string, string | undefined>,
): HostingConfig {
  const rawOrigin =
    env.GHOSTQA_PUBLIC_ORIGIN ??
    (env.RENDER === 'true' ? env.RENDER_EXTERNAL_URL : undefined);
  const port = env.PORT === undefined ? 3000 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid hosting configuration: PORT');
  if (!rawOrigin) {
    if (env.RENDER === 'true')
      throw new Error('Invalid hosting configuration: public origin required');
    return Object.freeze({ hostname: '127.0.0.1', port });
  }
  let url: URL;
  try {
    url = new URL(rawOrigin);
  } catch {
    throw new Error('Invalid hosting configuration: public origin');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Invalid hosting configuration: public origin');
  const password = env.GHOSTQA_ADMIN_PASSWORD;
  if (
    !password ||
    password.length < 32 ||
    password.length > 256 ||
    /[\r\n\x00]/.test(password)
  )
    throw new Error(
      'Invalid hosting configuration: GHOSTQA_ADMIN_PASSWORD must contain 32–256 characters',
    );
  return Object.freeze({
    hostname: '0.0.0.0',
    port,
    publicOrigin: url.origin,
    password,
  });
}

function validAuthorization(
  value: string | null | undefined,
  password: string,
) {
  if (
    !value ||
    value.length > 1024 ||
    !/^Basic [A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    return false;
  const decoded = Buffer.from(value.slice(6), 'base64').toString('utf8');
  const hash = (text: string) => createHash('sha256').update(text).digest();
  return timingSafeEqual(hash(decoded), hash(`ghostqa:${password}`));
}

export function hostedRequestAllowed(request: Request, config: HostingConfig) {
  if (!config.publicOrigin || !config.password) return false;
  return (
    request.headers.get('host') === new URL(config.publicOrigin).host &&
    validAuthorization(request.headers.get('authorization'), config.password)
  );
}

// The sole application ingress. This does not authorize target HTTP execution.
export function authorizeIngress(
  request: IncomingMessage,
  response: ServerResponse,
  config: HostingConfig,
): boolean {
  if (!config.publicOrigin) return true;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Strict-Transport-Security', 'max-age=31536000');
  if (
    request.headers.host !== new URL(config.publicOrigin).host ||
    !request.url?.startsWith('/') ||
    request.url.startsWith('//')
  ) {
    response.writeHead(403).end('Forbidden');
    return false;
  }
  if (request.method === 'GET' && request.url === '/healthz') {
    response
      .writeHead(200, { 'Content-Type': 'application/json' })
      .end('{"status":"ok"}');
    return false;
  }
  if (
    !config.password ||
    !validAuthorization(request.headers.authorization, config.password)
  ) {
    response
      .writeHead(401, {
        'WWW-Authenticate': 'Basic realm="GhostQA", charset="UTF-8"',
        'Content-Type': 'text/plain',
      })
      .end('Sign in with your GhostQA operator credentials.');
    return false;
  }
  // Render terminates TLS. Derive these values from approved configuration,
  // never from client-supplied forwarding headers.
  request.headers['x-forwarded-proto'] = 'https';
  request.headers['x-forwarded-host'] = new URL(config.publicOrigin).host;
  request.headers['x-forwarded-port'] =
    new URL(config.publicOrigin).port || '443';
  delete request.headers.forwarded;
  return true;
}
