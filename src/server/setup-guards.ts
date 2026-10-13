import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export function setupError(
  code: string,
  message: string,
  status: number,
  details: { field: string; message: string }[] = [],
) {
  return NextResponse.json(
    { code, message, details, requestId: randomUUID() },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
export function localRequest(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('host');
  return (
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    host !== null &&
    /^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/.test(host) &&
    new URL(`${url.protocol}//${host}`).port === url.port
  );
}
export function validSetupWrite(request: Request) {
  if (
    !localRequest(request) ||
    request.headers.get('origin') !==
      `${new URL(request.url).protocol}//${request.headers.get('host')}`
  )
    return false;
  const token = request.headers.get('x-ghostqa-csrf') ?? '';
  const cookie =
    request.headers
      .get('cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('ghostqa-setup='))
      ?.slice('ghostqa-setup='.length) ?? '';
  return (
    /^[a-f0-9]{64}$/.test(token) &&
    /^[a-f0-9]{64}$/.test(cookie) &&
    timingSafeEqual(Buffer.from(token), Buffer.from(cookie))
  );
}
export function setupNonce(request: Request) {
  if (!localRequest(request))
    return setupError(
      'FORBIDDEN',
      'Open GhostQA on localhost to import an API.',
      403,
    );
  const token = randomBytes(32).toString('hex');
  const response = NextResponse.json(
    { token },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set('ghostqa-setup', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 3600,
    secure: new URL(request.url).protocol === 'https:',
  });
  return response;
}
export async function boundedText(request: Request, limit: number) {
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > limit) throw new Error('IMPORT TOO LARGE');
  if (!request.body) throw new Error('INVALID OPENAPI');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('IMPORT TIMEOUT'));
      void reader.cancel();
    }, 10000);
  });
  try {
    while (true) {
      const result = await Promise.race([reader.read(), deadline]);
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new Error('IMPORT TOO LARGE');
      }
      chunks.push(result.value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
