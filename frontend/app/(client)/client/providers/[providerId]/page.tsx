import { notFound } from "next/navigation";

import ClientProviderProfilePage from "@/components/pages/client-provider-profile-page";
import { getProviderPublicProfile } from "@/api/client/provider";
import { ApiError } from "@/api/client";
import type { ProviderPublicProfile } from "@/lib/client/provider/types";

type Props = {
  params: Promise<{ providerId: string }>;
};

export default async function ClientProviderProfileRoute({ params }: Props) {
  const { providerId } = await params;

  let profile: ProviderPublicProfile | null = null;
  let error: string | undefined;

  try {
    profile = await getProviderPublicProfile(providerId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    error =
      err instanceof ApiError
        ? err.message
        : "Não foi possível carregar o perfil do profissional.";
  }

  return <ClientProviderProfilePage profile={profile} error={error} />;
}
