export const sensitiveNames = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'reset_token',
  'api_key',
  'authorization',
  'cookie',
  'set-cookie',
]);
export function sensitiveName(
  name: string,
  additional: readonly string[] = [],
) {
  return (
    sensitiveNames.has(name.toLowerCase()) ||
    additional.some((n) => n.toLowerCase() === name.toLowerCase())
  );
}
