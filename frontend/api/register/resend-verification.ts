import { apiFetch } from "@/api/client";
import type {
  ResendVerificationPayload,
  ResendVerificationResponse,
} from "@/lib/auth/types";

export function resendVerification(payload: ResendVerificationPayload) {
  return apiFetch<ResendVerificationResponse>("/auth/resend-email-verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
