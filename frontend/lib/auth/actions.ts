"use server";

import { login } from "@/api/login";
import { resetPassword } from "@/api/reset-password";
import type {
  LoginResponse,
  PublicRole,
  ResetPasswordPayload,
} from "@/lib/auth/types";

import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
} from "@/lib/auth/session.server";

export async function saveAuthSessionAction(data: LoginResponse): Promise<void> {
  await saveAuthSession(data);
}

export async function clearAuthSessionAction(): Promise<void> {
  await clearAuthSession();
}

export async function getAuthUserAction() {
  const session = await getAuthSession();
  return session?.user ?? null;
}

export async function resetPasswordAction(
  payload: ResetPasswordPayload,
): Promise<{ role: PublicRole }> {
  const resetResult = await resetPassword(payload);

  const loginData = await login({
    email: resetResult.user.email,
    password: payload.newPassword,
  });

  await saveAuthSession(loginData);

  return { role: loginData.user.role };
}
