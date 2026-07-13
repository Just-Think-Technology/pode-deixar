import "server-only";

import { redirect } from "next/navigation";

import { verifyAccessToken } from "@/api/auth/verify";
import { ApiError } from "@/api/client";
import {
  type AppArea,
  AREA_REQUIRED_ROLE,
  getLoginHrefForArea,
  ROLE_HOME_HREF,
  ROLE_LOGIN_HREF,
} from "@/lib/auth/require-role";
import { getAuthSession } from "@/lib/auth/session.server";
import type { AuthSession, AuthUser, PublicRole } from "@/lib/auth/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function isPublicRole(role: string): role is PublicRole {
  return role === "CLIENT" || role === "PROVIDER";
}

type VerifyOutcome =
  | { kind: "ok"; user: AuthUser; access_token: string }
  | { kind: "unauthorized" }
  | { kind: "unavailable" };

async function callVerify(accessToken: string): Promise<VerifyOutcome> {
  try {
    const result = await verifyAccessToken(accessToken);
    if (result.authorized && isPublicRole(result.user.role)) {
      return {
        kind: "ok",
        user: result.user,
        access_token: result.access_token,
      };
    }
    return { kind: "unauthorized" };
  } catch (err) {
    if (err instanceof ApiError && err.status >= 500) {
      return { kind: "unavailable" };
    }
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return { kind: "unauthorized" };
    }
    throw err;
  }
}

export async function requireValidSession(area: AppArea): Promise<AuthSession> {
  const session = await getAuthSession();
  const requiredRole = AREA_REQUIRED_ROLE[area];

  if (!session?.access_token || !session.user.role) {
    redirect(getLoginHrefForArea(area));
  }

  // Em modo mock (e2e / UI sem backend), confia no cookie de sessão.
  if (USE_MOCK) {
    if (session.user.role !== requiredRole) {
      redirect(
        `/auth/session/clear?to=${encodeURIComponent(ROLE_LOGIN_HREF[session.user.role])}`,
      );
    }
    return session;
  }

  const outcome = await callVerify(session.access_token);

  if (outcome.kind === "ok") {
    if (outcome.user.role !== requiredRole) {
      redirect(
        `/auth/session/clear?to=${encodeURIComponent(ROLE_LOGIN_HREF[outcome.user.role])}`,
      );
    }

    return {
      ...session,
      access_token: outcome.access_token,
      user: {
        id: outcome.user.id,
        complete_name: outcome.user.complete_name,
        email: outcome.user.email,
        role: outcome.user.role,
      },
    };
  }

  if (outcome.kind === "unavailable") {
    if (session.user.role !== requiredRole) {
      redirect(
        `/auth/session/clear?to=${encodeURIComponent(ROLE_LOGIN_HREF[session.user.role])}`,
      );
    }
    return session;
  }

  const next = encodeURIComponent(ROLE_HOME_HREF[requiredRole]);
  redirect(`/auth/session/refresh?area=${area}&next=${next}`);
}
