// Safe redirect path — validates a redirect target stays on our own origin

// An opaque base lets us compare origins without knowing the host at runtime.
// Any value that resolves off this origin (absolute URL, protocol-relative,
// backslash or control-character variant) is rejected.
const INTERNAL_BASE = "https://internal.invalid";

// WHATWG URL parsing folds backslashes and strips tab/CR/LF anywhere in the
// authority, so "/\evil.com" and "/\t/evil.com" both resolve to an external
// origin. Pattern-matching the raw string cannot see that, so reject control
// characters up front and let the origin comparison decide the rest.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function safeRedirectPath(
  path: string | null,
  fallback: string,
): string {
  // Backslashes are normalized to "/" by the URL parser, which is what turns
  // "/\evil.com" into an off-origin value. Reject them instead of normalizing.
  if (!path || !path.startsWith("/") || path.includes("\\") || CONTROL_CHARS.test(path)) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(path, INTERNAL_BASE);
  } catch {
    return fallback;
  }

  if (parsed.origin !== INTERNAL_BASE || parsed.protocol !== "https:") {
    return fallback;
  }

  // Keep the relative form (path + query + hash) for same-origin values.
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}