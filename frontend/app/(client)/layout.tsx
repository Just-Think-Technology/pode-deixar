import AppShell from "@/components/layouts/app-shell";
import ClientSidebar from "@/components/sidebar/client-sidebar";
import { requireValidSession } from "@/lib/auth/require-valid-session";

export default async function ClientAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireValidSession("client");

  return (
    <AppShell sidebar={<ClientSidebar user={session.user} />} hideInsetHeader>
      {children}
    </AppShell>
  );
}
