import { apiFetch } from "@/api/client";
import type { LoginPayload, LoginResponse } from "@/lib/auth/types";

export type { LoginPayload, LoginResponse };

export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
