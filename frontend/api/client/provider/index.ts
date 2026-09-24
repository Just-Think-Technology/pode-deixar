// Client provider API — public provider profile fetcher

import { apiFetch } from "@/api/client/http";
import { mockGetProviderPublicProfile } from "@/mock/client/provider";
import type { ProviderPublicProfile } from "@/lib/client/provider/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const PROVIDER_ROUTES = {
  profile: (providerId: string) => `/providers/${providerId}/profile`,
} as const;

export function getProviderPublicProfile(providerId: string) {
  if (USE_MOCK) {
    return mockGetProviderPublicProfile(providerId);
  }

  return apiFetch<ProviderPublicProfile>(PROVIDER_ROUTES.profile(providerId));
}
