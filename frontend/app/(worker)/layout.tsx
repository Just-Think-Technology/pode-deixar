import AppShell from "@/components/layouts/app-shell";
import WorkerSidebar from "@/components/sidebar/worker-sidebar";
import { requireValidSession } from "@/lib/auth/require-valid-session";

export default async function WorkerAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireValidSession("worker");

  return (
    <AppShell sidebar={<WorkerSidebar user={session.user} />}>
      {children}
    </AppShell>
  );
}
