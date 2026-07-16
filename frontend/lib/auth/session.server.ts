import "server-only";

import { cookies } from "next/headers";

import type { AuthSession, AuthUser, LoginResponse } from "@/lib/auth/types";

const AUTH_SESSION_COOKIE = "auth_session";
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

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
    cookieOptions(SEVEN_DAYS_SECONDS),
  );
}

async function saveSession(session: AuthSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    AUTH_SESSION_COOKIE,
    JSON.stringify(session),
    cookieOptions(session.expires_in),
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
  partial: Partial<AuthUser>,
): Promise<void> {
  const session = await getAuthSession();
  if (!session) return;

  const updated: AuthSession = {
    ...session,
    user: { ...session.user, ...partial },
  };

  await saveSession(updated);
}

export async function updateAuthSessionTokens(partial: Pick<AuthSession, "access_token" | "refresh_token" | "token_type">): Promise<void> {
  const session = await getAuthSession();
  if (!session) return;

  await saveSession({
    ...session,
    ...partial,
  });
}

export async function refreshAuthSession(): Promise<AuthSession | null> {
  const session = await getAuthSession();
  if (!session?.refresh_token) {
    await clearAuthSession();
    return null;
  }

  try {
    const { refreshAccessToken } = await import(
      "@/api/auth/refresh-token"
    );

    const tokens = await refreshAccessToken(session.refresh_token);

    const updated: AuthSession = {
      ...session,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };

    const cookieStore = await cookies();
    cookieStore.set(
      AUTH_SESSION_COOKIE,
      JSON.stringify(updated),
      cookieOptions(SEVEN_DAYS_SECONDS),
    );

    return updated;
  } catch {
    await clearAuthSession();
    return null;
  }
}
