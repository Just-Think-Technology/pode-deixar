"use server";

import type { LoginResponse } from "@/lib/auth/types";

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
