// Registration API — account creation fetcher

import { apiFetch } from "@/api/client/http";
import type { RegisterPayload, RegisterResponse } from "@/lib/auth/types";

export type { RegisterPayload, RegisterResponse };

export const REGISTER_ROUTES = {
  register: "/auth/register",
} as const;

export function register(payload: RegisterPayload) {
  return apiFetch<RegisterResponse>(REGISTER_ROUTES.register, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
