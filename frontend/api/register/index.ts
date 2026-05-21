import { apiFetch } from "@/api/client";
import type { RegisterPayload, RegisterResponse } from "@/lib/auth/types";

export type { RegisterPayload, RegisterResponse };

export function register(payload: RegisterPayload) {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
