// Password recovery API — password reset fetcher

import { apiFetch } from "@/api/client/http";
import type {
  ResetPasswordPayload,
  ResetPasswordResponse,
} from "@/lib/auth/types";

export type { ResetPasswordPayload };

export const RESET_PASSWORD_ROUTES = {
  reset: "/auth/reset-password",
} as const;

export function resetPassword(payload: ResetPasswordPayload) {
  return apiFetch<ResetPasswordResponse>(RESET_PASSWORD_ROUTES.reset, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
