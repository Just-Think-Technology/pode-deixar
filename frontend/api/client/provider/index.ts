import { apiFetch } from "@/api/client";
import { mockGetProviderPublicProfile } from "@/mock/client/provider";
import type { ProviderPublicProfile } from "@/lib/client/provider/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function getProviderPublicProfile(providerId: string) {
  if (USE_MOCK) {
    return mockGetProviderPublicProfile(providerId);
  }

  return apiFetch<ProviderPublicProfile>(`/providers/${providerId}/profile`);
}
