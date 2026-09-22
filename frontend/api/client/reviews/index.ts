// Provider reviews API — public review list fetcher

import { apiFetch } from "@/api/client";
import { mapProviderReview } from "@/lib/client/reviews/mappers";
import type {
  ProviderReview,
  RawProviderReview,
} from "@/lib/client/reviews/types";

export const INITIAL_REVIEWS_LIMIT = 10;
export const REVIEWS_PAGE_SIZE = 10;

export async function getProviderReviews(
  providerUserId: string,
  limit: number = INITIAL_REVIEWS_LIMIT,
): Promise<ProviderReview[]> {
  const raw = await apiFetch<RawProviderReview[]>(
    `/reviews/provider/${providerUserId}?limit=${limit}`,
  );

  return raw.map(mapProviderReview);
}
