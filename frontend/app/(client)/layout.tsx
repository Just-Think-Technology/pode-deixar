import RequireRole from "@/components/auth/require-role";
import AppShell from "@/components/layouts/app-shell";
import ClientSidebar from "@/components/sidebar/client-sidebar";

export default function ClientAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole area="client">
      <AppShell sidebar={<ClientSidebar />} hideInsetHeader>
        {children}
      </AppShell>
    </RequireRole>
  );
}
