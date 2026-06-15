import type { PublicRole } from "@/lib/auth/types";

export type AppArea = "client" | "worker";

export const AREA_REQUIRED_ROLE: Record<AppArea, PublicRole> = {
  client: "CLIENT",
  worker: "PROVIDER",
};

export const ROLE_LOGIN_HREF: Record<PublicRole, string> = {
  CLIENT: "/login/client",
  PROVIDER: "/login/worker",
};

export const ROLE_HOME_HREF: Record<PublicRole, string> = {
  CLIENT: "/client/home",
  PROVIDER: "/worker/dashboard",
};

export function getLoginHrefForArea(area: AppArea): string {
  return area === "client" ? ROLE_LOGIN_HREF.CLIENT : ROLE_LOGIN_HREF.PROVIDER;
}

export function getAreaForRole(role: PublicRole): AppArea {
  return role === "CLIENT" ? "client" : "worker";
}

export function decodeAccessTokenRole(token: string): PublicRole | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    const role = decoded.role as string | undefined;
    if (role === "CLIENT" || role === "PROVIDER") {
      return role;
    }
  } catch {
    return null;
  }
  return null;
}

export function roleMismatchMessage(expected: PublicRole): string {
  const label = expected === "CLIENT" ? "cliente" : "profissional";
  return `Esta área é exclusiva para usuários ${label}. Faça login na página correta.`;
}
