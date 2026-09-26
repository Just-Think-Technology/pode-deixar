// Server token refresh — withTokenRefresh wired to real session helpers

"use server";

import { withTokenRefresh, isApiUnauthorized } from "@/api/client/with-token-refresh";
import { getAccessToken, refreshAuthSession } from "@/lib/auth/session.server";

/**
 * Calls fn with a valid access token, refreshing once on 401.
 * Server-only entry point: client components must never import this module
 * (it pulls session.server into the bundle). Tests target withTokenRefresh
 * directly with injected deps.
 *
 * @param fn - Function receiving the access token
 * @returns Result of fn
 * @throws Error when no session or refresh fails
 */
export async function withServerTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
): Promise<T> {
  return withTokenRefresh(fn, {
    getAccessToken,
    refreshSession: refreshAuthSession,
    isUnauthorizedError: isApiUnauthorized,
  });
}
