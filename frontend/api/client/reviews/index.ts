// Provider reviews API — public review list fetcher

import { apiFetch } from "@/api/client";
import { mapProviderReview } from "@/lib/client/reviews/mappers";
import type {
  ProviderReview,
  RawProviderReview,
} from "@/lib/client/reviews/types";
import { mockGetProviderReviews } from "@/mock/client/reviews";

export const INITIAL_REVIEWS_LIMIT = 10;
export const REVIEWS_PAGE_SIZE = 10;

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getProviderReviews(
  providerUserId: string,
  limit: number = INITIAL_REVIEWS_LIMIT,
): Promise<ProviderReview[]> {
  const raw: RawProviderReview[] = USE_MOCK
    ? mockGetProviderReviews(providerUserId, limit)
    : await apiFetch<RawProviderReview[]>(
        `/reviews/provider/${providerUserId}?limit=${limit}`,
      );

  return raw.map(mapProviderReview);
}
