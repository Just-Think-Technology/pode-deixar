"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  getLoginHrefForArea,
  getRoleFromAccessToken,
  ROLE_LOGIN_HREF,
  roleMismatchMessage,
  type AppArea,
  AREA_REQUIRED_ROLE,
} from "@/lib/auth/require-role";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session";
import type { PublicRole } from "@/lib/auth/types";
import { Spinner } from "@/components/ui/spinner";

type RequireRoleProps = {
  area: AppArea;
  children: ReactNode;
};

export default function RequireRole({ area, children }: RequireRoleProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const requiredRole = AREA_REQUIRED_ROLE[area];

  useEffect(() => {
    const session = getAuthSession();
    const userRole: PublicRole | null =
      session?.user.role ?? getRoleFromAccessToken();

    if (!userRole) {
      router.replace(getLoginHrefForArea(area));
      return;
    }

    if (userRole !== requiredRole) {
      clearAuthSession();
      toast.error(roleMismatchMessage(requiredRole));
      router.replace(ROLE_LOGIN_HREF[userRole]);
      return;
    }

    setAllowed(true);
  }, [area, requiredRole, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
