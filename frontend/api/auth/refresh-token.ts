// Auth API — session token refresh fetcher

import { apiFetch } from "@/api/client/http";

export const AUTH_ROUTES = {
  refreshToken: "/auth/refresh-token",
  verify: "/auth/verify",
} as const;

export type RefreshTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  return apiFetch<RefreshTokenResponse>(AUTH_ROUTES.refreshToken, {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
