// Single withTokenRefresh helper — deduplicated token refresh for server actions

import { ApiError } from "@/api/client/http";

// --- Interface for testability ---

export type TokenRefreshDeps = {
  getAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<{ access_token: string } | null>;
  isUnauthorizedError: (error: unknown) => boolean;
};

async function getDefaultDeps(): Promise<TokenRefreshDeps> {
  const { getAccessToken, refreshAuthSession } = await import(
    "@/lib/auth/session.server"
  );
  return {
    getAccessToken,
    refreshSession: refreshAuthSession,
    isUnauthorizedError: (err) => err instanceof ApiError && err.status === 401,
  };
}

/**
 * Calls fn with a valid access token, refreshing once on 401.
 * Single authoritative implementation — all server actions must import
 * this helper instead of defining local copies.
 *
 * @param fn - Function receiving the access token
 * @param deps - Injectable deps for tests (defaults to real session helpers)
 * @returns Result of fn
 * @throws Error when no session or refresh fails
 */
export async function withTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
  deps?: TokenRefreshDeps,
): Promise<T> {
  const resolvedDeps = deps ?? (await getDefaultDeps());
  const token = await resolvedDeps.getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    return await fn(token);
  } catch (err) {
    if (resolvedDeps.isUnauthorizedError(err)) {
      const refreshed = await resolvedDeps.refreshSession();
      if (!refreshed?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fn(refreshed.access_token);
    }
    throw err;
  }
}
