import { apiFetch, apiFetchAuth } from "@/api/client";
import type { VerifySessionResponse } from "@/lib/auth/types";

export async function verifyAccessToken(
  accessToken: string | null,
): Promise<VerifySessionResponse> {
  if (!accessToken) {
    return apiFetch<VerifySessionResponse>("/auth/verify", {
      method: "GET",
    });
  }

  return apiFetchAuth<VerifySessionResponse>("/auth/verify", accessToken, {
    method: "GET",
  });
}
