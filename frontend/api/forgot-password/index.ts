import { apiFetch } from "@/api/client";
import type { ForgotPasswordPayload, forgotPasswordResponse} from "@/lib/auth/types";

export type { ForgotPasswordPayload };

export function forgotPassword(payload: ForgotPasswordPayload) {
  return apiFetch<forgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}   
