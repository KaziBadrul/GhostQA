import { isIP } from 'node:net';
export function normalizeIp(ip: string) {
  if (ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4) return ip.slice(7);
  if (isIP(ip) === 6) {
    const canonical = new URL(`http://[${ip}]/`).hostname
      .slice(1, -1)
      .toLowerCase();
    if (canonical.startsWith('::ffff:')) {
      const parts = canonical.slice(7).split(':');
      if (parts.length === 2) {
        const high = parseInt(parts[0]!, 16),
          low = parseInt(parts[1]!, 16);
        return [high >>> 8, high & 255, low >>> 8, low & 255].join('.');
      }
    }
    return canonical;
  }
  return ip;
}
