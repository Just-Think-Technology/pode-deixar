// Session route — clears the auth cookie

import { NextRequest, NextResponse } from "next/server";

import {
  type AppArea,
  getLoginHrefForArea,
} from "@/lib/auth/require-role";
import { clearAuthSession } from "@/lib/auth/session.server";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

function resolveArea(value: string | null): AppArea {
  return value === "client" ? "client" : "worker";
}

export async function POST(request: NextRequest) {
  const area = resolveArea(request.nextUrl.searchParams.get("area"));
  const fallback = getLoginHrefForArea(area);
  const to = safeRedirectPath(
    request.nextUrl.searchParams.get("to"),
    fallback,
  );

  await clearAuthSession();
  return NextResponse.redirect(new URL(to, request.url));
}
