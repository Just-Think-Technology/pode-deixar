// Auth API — session verification fetcher

import { apiFetch, apiFetchAuth } from "@/api/client/http";
import { AUTH_ROUTES } from "./refresh-token";
import type { VerifySessionResponse } from "@/lib/auth/types";

export async function verifyAccessToken(
  accessToken: string | null,
): Promise<VerifySessionResponse> {
  if (!accessToken) {
    return apiFetch<VerifySessionResponse>(AUTH_ROUTES.verify, {
      method: "GET",
    });
  }

  return apiFetchAuth<VerifySessionResponse>(AUTH_ROUTES.verify, accessToken, {
    method: "GET",
  });
}
