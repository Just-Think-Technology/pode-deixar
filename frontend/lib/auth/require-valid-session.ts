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

/**
 * Valida a sessão no backend (GET /auth/verify) antes de renderizar
 * páginas autenticadas. Mutações de cookie (refresh/clear/sync) ficam
 * em Route Handlers — layouts Server Component não podem set/delete cookies.
 */
export async function requireValidSession(area: AppArea): Promise<AuthSession> {
  const session = await getAuthSession();
  const requiredRole = AREA_REQUIRED_ROLE[area];

  if (!session?.access_token || !session.user.role) {
    redirect(getLoginHrefForArea(area));
  }

  const outcome = await callVerify(session.access_token);

  if (outcome.kind === "ok") {
    if (outcome.user.role !== requiredRole) {
      redirect(
        `/auth/session/clear?to=${encodeURIComponent(ROLE_LOGIN_HREF[outcome.user.role])}`,
      );
    }

    // Usa dados do verify na renderização; sync de cookie só via Route Handler
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

  // Token inválido/expirado: tenta refresh em Route Handler (pode mutar cookies)
  const next = encodeURIComponent(ROLE_HOME_HREF[requiredRole]);
  redirect(`/auth/session/refresh?area=${area}&next=${next}`);
}
