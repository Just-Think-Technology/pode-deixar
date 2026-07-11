import { NextRequest, NextResponse } from "next/server";

import {
  type AppArea,
  getLoginHrefForArea,
} from "@/lib/auth/require-role";
import { clearAuthSession } from "@/lib/auth/session.server";

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
  const fallback = getLoginHrefForArea(area);
  const to = safeRedirectPath(
    request.nextUrl.searchParams.get("to"),
    fallback,
  );

  await clearAuthSession();
  return NextResponse.redirect(new URL(to, request.url));
}
