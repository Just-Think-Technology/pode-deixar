import { isIP } from 'net';

// purpose — safe IP extraction from x-forwarded-for header, blocking spoofing/injection
export function extractSafeIp(value?: string): string {
  if (!value) return 'unknown';
  const first = value
    .split(',')[0]
    .replace(/[\r\n]/g, '')
    .trim();
  return isIP(first) ? first : 'unknown';
}
