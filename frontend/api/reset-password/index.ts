import { apiFetch } from "@/api/client";
import type {
  ResetPasswordPayload,
  ResetPasswordResponse,
} from "@/lib/auth/types";

export type { ResetPasswordPayload };

export function resetPassword(payload: ResetPasswordPayload) {
  return apiFetch<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
