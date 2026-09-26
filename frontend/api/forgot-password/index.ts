// Password recovery API — forgot-password fetcher

import { apiFetch } from "@/api/client/http";
import type { ForgotPasswordPayload, forgotPasswordResponse} from "@/lib/auth/types";

export type { ForgotPasswordPayload };

export const FORGOT_PASSWORD_ROUTES = {
  forgot: "/auth/forgot-password",
} as const;

export function forgotPassword(payload: ForgotPasswordPayload) {
  return apiFetch<forgotPasswordResponse>(FORGOT_PASSWORD_ROUTES.forgot, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
