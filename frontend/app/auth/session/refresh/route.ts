import { NextRequest, NextResponse } from "next/server";

import { verifyAccessToken } from "@/api/auth/verify";
import {
  type AppArea,
  AREA_REQUIRED_ROLE,
  getLoginHrefForArea,
  ROLE_HOME_HREF,
  ROLE_LOGIN_HREF,
} from "@/lib/auth/require-role";
import {
  clearAuthSession,
  getAuthSession,
  refreshAuthSession,
  updateAuthSessionUser,
} from "@/lib/auth/session.server";

function resolveArea(value: string | null): AppArea {
  return value === "client" ? "client" : "worker";
}

function safeRedirectPath(path: string | null, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }
  return path;
}

export async function GET(request: NextRequest) {
  const area = resolveArea(request.nextUrl.searchParams.get("area"));
  const requiredRole = AREA_REQUIRED_ROLE[area];
  const home = ROLE_HOME_HREF[requiredRole];
  const next = safeRedirectPath(
    request.nextUrl.searchParams.get("next"),
    home,
  );
  const loginHref = getLoginHrefForArea(area);

  const session = await getAuthSession();
  if (!session?.refresh_token) {
    await clearAuthSession();
    return NextResponse.redirect(new URL(loginHref, request.url));
  }

  const refreshed = await refreshAuthSession();
  if (!refreshed?.access_token) {
    return NextResponse.redirect(new URL(loginHref, request.url));
  }

  try {
    const verified = await verifyAccessToken(refreshed.access_token);
    if (!verified.authorized) {
      await clearAuthSession();
      return NextResponse.redirect(new URL(loginHref, request.url));
    }

    if (verified.user.role !== requiredRole) {
      await clearAuthSession();
      const target =
        verified.user.role === "CLIENT" || verified.user.role === "PROVIDER"
          ? ROLE_LOGIN_HREF[verified.user.role]
          : loginHref;
      return NextResponse.redirect(new URL(target, request.url));
    }

    await updateAuthSessionUser({
      id: verified.user.id,
      complete_name: verified.user.complete_name,
      email: verified.user.email,
      role: verified.user.role,
    });

    return NextResponse.redirect(new URL(next, request.url));
  } catch {
    await clearAuthSession();
    return NextResponse.redirect(new URL(loginHref, request.url));
  }
}
