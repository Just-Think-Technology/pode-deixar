"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ROLE_HOME_HREF } from "@/lib/auth/require-role";
import { getAuthSession } from "@/lib/auth/session";

export default function LandingRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = getAuthSession();
    if (session?.user.role) {
      router.replace(ROLE_HOME_HREF[session.user.role]);
    }
  }, [router]);

  return null;
}
