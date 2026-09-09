import { isIP } from 'net';

// Trusts only the first x-forwarded-for entry from the configured proxy and strips CR/LF to block spoofing and log injection; returns 'unknown' when absent or invalid.
export function extractSafeIp(value?: string): string {
  if (!value) return 'unknown';
  const first = value
    .split(',')[0]
    .replace(/[\r\n]/g, '')
    .trim();
  return isIP(first) ? first : 'unknown';
}
