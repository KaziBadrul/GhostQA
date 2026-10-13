'use client';
import { AppRequestError, type FieldIssue } from './error-guidance';
function responseError(value: unknown, status: number) {
  const record =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const code =
    typeof record.code === 'string'
      ? record.code
      : typeof record.error === 'string'
        ? record.error
        : 'APPLICATION UNAVAILABLE';
  const issues: FieldIssue[] = Array.isArray(record.details)
    ? record.details
        .filter(
          (item): item is FieldIssue =>
            !!item &&
            typeof item === 'object' &&
            typeof item.field === 'string' &&
            typeof item.message === 'string',
        )
        .slice(0, 8)
    : [];
  return new AppRequestError(code, status, issues);
}
export async function appRequest(
  path: string,
  method = 'GET',
  value?: unknown,
  text = false,
): Promise<unknown> {
  if (!/^\/api\/[A-Za-z0-9/_-]+$/.test(path))
    throw new Error('Invalid local application path');
  try {
    const headers: Record<string, string> = {};
    if (method !== 'GET') {
      const response = await fetch('/api/setup', {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      const nonce: unknown = await response.json();
      if (!response.ok) throw responseError(nonce, response.status);
      if (
        !nonce ||
        typeof nonce !== 'object' ||
        !('token' in nonce) ||
        typeof nonce.token !== 'string'
      )
        throw new AppRequestError('APPLICATION UNAVAILABLE');
      headers['x-ghostqa-csrf'] = nonce.token;
      headers['content-type'] = text ? 'text/plain' : 'application/json';
    }
    const response = await fetch(path, {
      method,
      headers,
      body:
        method === 'GET'
          ? undefined
          : text
            ? String(value)
            : JSON.stringify(value ?? {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });
    const result: unknown = await response.json();
    if (!response.ok) throw responseError(result, response.status);
    return result;
  } catch (error) {
    if (error instanceof AppRequestError) throw error;
    if (
      error instanceof Error &&
      ['TimeoutError', 'AbortError'].includes(error.name)
    )
      throw new AppRequestError(
        method === 'GET' ? 'READ TIMEOUT' : 'WRITE TIMEOUT',
      );
    throw new AppRequestError('NETWORK ERROR');
  }
}
