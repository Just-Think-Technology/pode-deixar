import { redirect } from "next/navigation";

import AppShell from "@/components/layouts/app-shell";
import WorkerSidebar from "@/components/sidebar/worker-sidebar";
import {
  AREA_REQUIRED_ROLE,
  getLoginHrefForArea,
  ROLE_LOGIN_HREF,
} from "@/lib/auth/require-role";
import { clearAuthSession, getAuthSession } from "@/lib/auth/session.server";

export default async function WorkerAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  const requiredRole = AREA_REQUIRED_ROLE.worker;

  if (!session?.user.role) {
    redirect(getLoginHrefForArea("worker"));
  }

  if (session.user.role !== requiredRole) {
    await clearAuthSession();
    redirect(ROLE_LOGIN_HREF[session.user.role]);
  }

  return (
    <AppShell sidebar={<WorkerSidebar user={session.user} />}>
      {children}
    </AppShell>
  );
}
