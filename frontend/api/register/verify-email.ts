// Registration API — email verification fetcher

import { apiFetch } from "@/api/client/http";
import type { VerifyEmailPayload, VerifyEmailResponse } from "@/lib/auth/types";

export const VERIFY_EMAIL_ROUTES = {
  verify: "/auth/verify-email",
} as const;

export function verifyEmail(payload: VerifyEmailPayload) {
  return apiFetch<VerifyEmailResponse>(VERIFY_EMAIL_ROUTES.verify, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
