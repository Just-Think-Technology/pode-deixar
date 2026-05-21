import { apiFetch } from "@/api/client";
import type { VerifyEmailPayload, VerifyEmailResponse } from "@/lib/auth/types";

export function verifyEmail(payload: VerifyEmailPayload) {
  return apiFetch<VerifyEmailResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
