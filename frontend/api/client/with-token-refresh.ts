// Single withTokenRefresh helper — deduplicated token refresh for server actions
//
// Client-safe: this module never references server-only session helpers
// (not even lazily — Next traces dynamic imports into browser bundles).
// Server actions use withServerTokenRefresh from lib/auth/server-token-refresh.

import { ApiError } from "@/api/client/http";

// --- Interface for testability ---

export type TokenRefreshDeps = {
  getAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<{ access_token: string } | null>;
  isUnauthorizedError: (error: unknown) => boolean;
};

/**
 * Calls fn with a valid access token, refreshing once on 401.
 * Single authoritative implementation — server actions use
 * withServerTokenRefresh (real session deps); tests inject deps.
 *
 * @param fn - Function receiving the access token
 * @param deps - Session deps (required; injected for tests)
 * @returns Result of fn
 * @throws Error when no session or refresh fails
 */
export async function withTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
  deps: TokenRefreshDeps,
): Promise<T> {
  const token = await deps.getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    return await fn(token);
  } catch (err) {
    if (deps.isUnauthorizedError(err)) {
      const refreshed = await deps.refreshSession();
      if (!refreshed?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fn(refreshed.access_token);
    }
    throw err;
  }
}

/**
 * Default 401 predicate for TokenRefreshDeps.
 * @param error - Caught error
 * @returns True for HTTP 401 API errors
 */
export function isApiUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
