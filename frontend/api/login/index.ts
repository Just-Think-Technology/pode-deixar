// Login API — credential authentication fetcher

import { apiFetch } from "@/api/client/http";
import type { LoginPayload, LoginResponse } from "@/lib/auth/types";

export type { LoginPayload, LoginResponse };

export const LOGIN_ROUTES = {
  login: "/auth/login",
} as const;

export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>(LOGIN_ROUTES.login, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
