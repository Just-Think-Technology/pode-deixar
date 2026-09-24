// Registration API — verification email resend fetcher

import { apiFetch } from "@/api/client/http";
import type {
  ResendVerificationPayload,
  ResendVerificationResponse,
} from "@/lib/auth/types";

export const RESEND_VERIFICATION_ROUTES = {
  resend: "/auth/resend-email-verification",
} as const;

export function resendVerification(payload: ResendVerificationPayload) {
  return apiFetch<ResendVerificationResponse>(RESEND_VERIFICATION_ROUTES.resend, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
