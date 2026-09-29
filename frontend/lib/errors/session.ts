// Session expiry guard — single toast + redirect for concurrent 401s

const SESSION_NOTICE_COOLDOWN_MS = 30_000;

let lastSessionNoticeAt: number | null = null;

/**
 * Single-flight guard for session-expired handling. Concurrent 401s
 * (parallel fetches, retries) must produce one toast and one redirect.
 *
 * @param now - Current timestamp (injectable for tests)
 * @returns True when the caller should notify + redirect
 */
export function shouldNotifySessionExpired(now: number = Date.now()): boolean {
  if (
    lastSessionNoticeAt !== null &&
    now - lastSessionNoticeAt < SESSION_NOTICE_COOLDOWN_MS
  ) {
    return false;
  }
  lastSessionNoticeAt = now;
  return true;
}

/**
 * Resets the session notice guard. Test-only helper.
 */
export function resetSessionNoticeGuard(): void {
  lastSessionNoticeAt = null;
}
