import RequireRole from "@/components/auth/require-role";
import AppShell from "@/components/layouts/app-shell";
import WorkerSidebar from "@/components/sidebar/worker-sidebar";

export default function WorkerAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole area="worker">
      <AppShell sidebar={<WorkerSidebar />}>{children}</AppShell>
    </RequireRole>
  );
}
