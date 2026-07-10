import { getAccessToken } from "@/lib/auth/session.server";
import ClientSearchPage from "@/components/pages/client-search-page";

export default async function ClientSearchRoute() {
  const accessToken = await getAccessToken();

  return <ClientSearchPage accessToken={accessToken ?? undefined} />;
}
