// Client provider API — public provider profile fetcher

import { apiFetch } from "@/api/client";
import type { ProviderPublicProfile } from "@/lib/client/provider/types";

export function getProviderPublicProfile(providerId: string) {
  return apiFetch<ProviderPublicProfile>(`/providers/${providerId}/profile`);
}