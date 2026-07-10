import { notFound } from "next/navigation";

import { getCategories } from "@/api/client/categories";
import { getProviderPublicProfile } from "@/api/client/provider";
import { ApiError } from "@/api/client";
import ClientRequestQuotePage from "@/components/pages/client-request-quote-page";
import type { Category } from "@/lib/client/quote/types";
import type { ProviderPublicProfile } from "@/lib/client/provider/types";

type Props = {
  params: Promise<{ providerId: string }>;
};

export default async function ClientRequestQuoteRoute({ params }: Props) {
  const { providerId } = await params;

  let profile: ProviderPublicProfile | null = null;
  let categories: Category[] = [];
  let error: string | undefined;

  try {
    const [profileResult, categoriesResult] = await Promise.all([
      getProviderPublicProfile(providerId),
      getCategories(),
    ]);
    profile = profileResult;
    categories = categoriesResult;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    error =
      err instanceof ApiError
        ? err.message
        : "Não foi possível carregar os dados para a solicitação.";
  }

  return (
    <ClientRequestQuotePage
      profile={profile}
      categories={categories}
      error={error}
    />
  );
}
