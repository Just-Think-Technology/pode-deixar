import { apiFetch } from "@/api/client";

export type RefreshTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  return apiFetch<RefreshTokenResponse>("/auth/refresh-token", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
