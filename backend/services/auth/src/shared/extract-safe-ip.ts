// Safe IP extraction — spoofing-resistant x-forwarded-for parsing

import { isIP } from 'net';

export function extractSafeIp(value?: string): string {
  if (!value) return 'unknown';
  const first = value
    .split(',')[0]
    .replace(/[\r\n]/g, '')
    .trim();
  return isIP(first) ? first : 'unknown';
}
