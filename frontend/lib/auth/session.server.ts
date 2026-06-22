import "server-only";

import { cookies } from "next/headers";

import type { AuthSession, AuthUser, LoginResponse } from "@/lib/auth/types";

const AUTH_SESSION_COOKIE = "auth_session";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function saveAuthSession(data: LoginResponse): Promise<void> {
  const session: AuthSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
    user: data.user,
  };

  const cookieStore = await cookies();
  cookieStore.set(
    AUTH_SESSION_COOKIE,
    JSON.stringify(session),
    cookieOptions(data.expires_in),
  );
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.access_token ?? null;
}

export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE);
}

export async function updateAuthSessionUser(
  partial: Pick<AuthUser, "complete_name" | "email">,
): Promise<void> {
  const session = await getAuthSession();
  if (!session) return;

  const updated: AuthSession = {
    ...session,
    user: { ...session.user, ...partial },
  };

  const cookieStore = await cookies();
  cookieStore.set(
    AUTH_SESSION_COOKIE,
    JSON.stringify(updated),
    cookieOptions(session.expires_in),
  );
}
