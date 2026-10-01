import { isIP } from 'node:net';
import { normalizeIp } from '../../transport/address';
export { normalizeIp } from '../../transport/address';
import { FrozenScopeSchema, type FrozenScope, type Phase } from '../contracts';
export function pathSegments(text: string) {
  if (/[\\#]|%(?![0-9a-f]{2})/i.test(text)) throw new Error('INVALID URL');
  let decoded = text;
  for (let count = 0; count < 3; count++) {
    if (/%2f|%5c/i.test(decoded)) throw new Error('ENCODED SEPARATOR');
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      throw new Error('INVALID URL');
    }
    if (decoded.split('/').some((s) => s === '.' || s === '..'))
      throw new Error('DOT SEGMENT');
    if (!/%[0-9a-f]{2}/i.test(decoded)) break;
    if (count === 2) throw new Error('AMBIGUOUS ENCODING');
  }
  return decoded.split('/').filter(Boolean);
}
function parse(text: string) {
  const match = /^https?:\/\/([^/?#]+)([^?#]*)(\?[^#]*)?$/.exec(text);
  if (
    !match ||
    match[1]?.includes('@') ||
    text.includes('\\') ||
    text.includes('#')
  )
    throw new Error('INVALID URL');
  const segments = pathSegments(match[2] || '/');
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error('INVALID URL');
  }
  return { url, segments };
}
export function approveScope(
  target: string,
  addresses: FrozenScope['addresses'],
  operationPolicy: FrozenScope['operationPolicy'],
  mutationsAcknowledged: boolean,
  approvalId: string,
): FrozenScope {
  const { url, segments } = parse(target);
  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (
    isIP(literal) &&
    addresses.some((a) => normalizeIp(a.ip) !== normalizeIp(literal))
  )
    throw new Error('PIN MISMATCH');
  if (url.search) throw new Error('BASE QUERY');
  if (addresses.some((a) => isIP(a.ip) !== a.family))
    throw new Error('INVALID ADDRESS');
  return FrozenScopeSchema.parse({
    origin: url.origin,
    hostname: url.hostname,
    port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    basePathSegments: segments,
    addresses: addresses
      .map((a) => ({
        ip: normalizeIp(a.ip),
        family: isIP(normalizeIp(a.ip)) as 4 | 6,
      }))
      .sort((a, b) => a.ip.localeCompare(b.ip)),
    operationIds: operationPolicy
      .filter((p) => p.category !== 'EXCLUDED')
      .map((p) => p.operationId),
    operationPolicy,
    approvalId,
    mutationsAcknowledged,
  });
}
export function assertUrl(scope: FrozenScope, target: string) {
  const { url, segments } = parse(target);
  if (
    url.origin !== scope.origin ||
    scope.basePathSegments.some((s, i) => segments[i] !== s)
  )
    throw new Error('SCOPE ESCAPE');
  return url;
}
export function authorizeOperation(
  scope: FrozenScope,
  id: string,
  phase: Phase,
) {
  const permission = scope.operationPolicy.find((p) => p.operationId === id);
  if (
    !permission ||
    permission.category === 'EXCLUDED' ||
    !permission.phases.includes(phase)
  )
    throw new Error('OPERATION FORBIDDEN');
  if (!scope.operationIds.includes(id)) throw new Error('OPERATION FORBIDDEN');
}

export function validateFrozenScope(scope: FrozenScope) {
  const parsed = FrozenScopeSchema.parse(scope);
  const reconstructed = approveScope(
    `${parsed.origin}/${parsed.basePathSegments.map(encodeURIComponent).join('/')}`,
    parsed.addresses,
    parsed.operationPolicy,
    parsed.mutationsAcknowledged,
    parsed.approvalId,
  );
  if (
    parsed.origin !== reconstructed.origin ||
    parsed.hostname !== reconstructed.hostname ||
    parsed.port !== reconstructed.port ||
    JSON.stringify(parsed.basePathSegments) !==
      JSON.stringify(reconstructed.basePathSegments) ||
    new Set(parsed.operationIds).size !== parsed.operationIds.length ||
    parsed.operationIds.length !== reconstructed.operationIds.length ||
    parsed.operationIds.some((id) => !reconstructed.operationIds.includes(id))
  )
    throw new Error('INVALID FROZEN SCOPE');
  return parsed;
}
