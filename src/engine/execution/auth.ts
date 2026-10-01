import type { Run, Json } from '../contracts';
import { validateHeaders } from '../policy/headers';
export function serializedHeaders(
  input: Record<string, Json>,
): Record<string, string> {
  const result: Record<string, string> = {};
  const primitive = (value: Json): string => {
    if (
      value === null ||
      typeof value === 'object' ||
      (typeof value === 'number' && !Number.isFinite(value))
    )
      throw new Error('INVALID HEADER VALUE');
    return String(value);
  };
  for (const [name, value] of Object.entries(input))
    result[name] = Array.isArray(value)
      ? value.map(primitive).join(',')
      : primitive(value);
  return validateHeaders(result);
}
export function injectAuthentication(
  input: Record<string, Json>,
  bindings: ReadonlyArray<Omit<Run['credentialBindings'][number], 'version'>>,
  credentials: ReadonlyMap<string, string>,
) {
  serializedHeaders(input);
  const headers: Record<string, Json> = Object.fromEntries(
    Object.entries(input).map(([name, value]) => [name.toLowerCase(), value]),
  );
  for (const binding of bindings) {
    const secret = credentials.get(binding.slot);
    if (secret === undefined) throw new Error('CREDENTIAL UNAVAILABLE');
    headers[binding.name.toLowerCase()] ??=
      binding.kind === 'bearer' ? 'Bearer ' + secret : secret;
  }
  serializedHeaders(headers);
  return headers;
}
