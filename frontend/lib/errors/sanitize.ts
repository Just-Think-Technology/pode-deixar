// Error sanitization — blocks technical details from reaching the UI

const TECHNICAL_PATTERNS: ReadonlyArray<RegExp> = [
  /\bP\d{4}\b/,
  /\b(exception|stack trace|stacktrace|stack:)\b/i,
  /\bat\s+[\w$.]+\s*\(/,
  /\b(select|insert|update|delete)\b.+\bfrom\b/i,
  /\b(constraint|violates|foreign key|unique violation)\b/i,
  /\bmust be\b/i,
  /\bshould be\b/i,
  /\bexpected\b/i,
  /\binvalid uuid\b/i,
  /\buuid\b/i,
  /\bHTTP\s*\d{3}\b/i,
  /\bBad Request\b/,
  /\bInternal Server Error\b/,
  /\/api\//,
  /\bbearer\s/i,
  /\btoken\s*[:=]/i,
  /\bpassword\s*[:=]/i,
  /\bcvv\b/i,
  /\bclass\s+\w+Error\b/,
  /\bnestjs\b/i,
  /\bprisma\b/i,
  /\bnode_modules\b/i,
  /\.js:\d+/,
  // Generic English HTTP/validation defaults from Nest — never user-facing
  /\bvalidation failed\b/i,
  /\bunauthorized\b/i,
  /\bforbidden\b/i,
  /\bnot found\b/i,
  /\btoo many requests\b/i,
  /\bservice unavailable\b/i,
  /\bgateway timeout\b/i,
  /\bconflict\b/i,
];

const MIN_BUSINESS_MESSAGE_LENGTH = 8;

const MAX_BUSINESS_MESSAGE_LENGTH = 200;

/**
 * Checks whether a backend message carries technical details that must
 * never reach the UI.
 *
 * @param message - Raw message from the API
 * @returns True when the message is technical and must be replaced
 */
export function isTechnicalMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (trimmed.length > MAX_BUSINESS_MESSAGE_LENGTH) return true;
  // Single tokens and fragments are never complete user-facing sentences
  if (!trimmed.includes(" ") && trimmed.length < MIN_BUSINESS_MESSAGE_LENGTH) {
    return true;
  }
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Returns the backend message when it is safe for display, otherwise
 * the provided friendly fallback.
 *
 * @param candidate - Raw backend message, if any
 * @param fallback - Friendly PT-BR fallback
 * @returns Safe user-facing message
 */
export function sanitizeMessage(
  candidate: string | null | undefined,
  fallback: string,
): string {
  if (!candidate) return fallback;
  const firstLine = candidate.split("\n")[0]?.trim() ?? "";
  if (!firstLine || isTechnicalMessage(firstLine)) return fallback;
  return firstLine;
}
