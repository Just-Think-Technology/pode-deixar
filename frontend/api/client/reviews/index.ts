// Provider reviews API — paginated list and summary fetchers (auth CLIENT,PROVIDER)

import { apiFetchAuth } from "@/api/client/http";
import {
  mapProviderReview,
  mapReviewsPage,
  mapReviewsSummary,
} from "@/lib/client/reviews/mappers";
import type {
  ProviderReview,
  RawProviderReview,
  RawReviewsPage,
  RawReviewsSummary,
  ReviewsPage,
  ReviewsSummary,
} from "@/lib/client/reviews/types";
import {
  mockGetProviderReviews,
  mockGetProviderReviewsSummary,
} from "@/mock/client/reviews";

export const INITIAL_REVIEWS_LIMIT = 10;
export const REVIEWS_PAGE_SIZE = 10;

export const REVIEWS_ROUTES = {
  provider: (providerId: string, page: number, limit: number) =>
    `/reviews/provider/${providerId}?page=${page}&limit=${limit}`,
  summary: (providerId: string) => `/reviews/provider/${providerId}/summary`,
} as const;

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export type ProviderReviewsQuery = {
  page?: number;
  limit?: number;
};

export async function getProviderReviews(
  accessToken: string,
  providerId: string,
  query: ProviderReviewsQuery = {},
): Promise<ReviewsPage<ProviderReview>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? INITIAL_REVIEWS_LIMIT;

  if (USE_MOCK) {
    const all = mockGetProviderReviews(providerId, Number.MAX_SAFE_INTEGER);
    const start = (page - 1) * limit;
    const slice = all.slice(start, start + limit);

    return {
      data: slice.map(mapProviderReview),
      meta: {
        total: all.length,
        page,
        limit,
        hasMore: start + limit < all.length,
      },
    };
  }

  const raw = await apiFetchAuth<RawReviewsPage<RawProviderReview>>(
    REVIEWS_ROUTES.provider(providerId, page, limit),
    accessToken,
    { method: "GET" },
  );

  return mapReviewsPage(raw);
}

export async function getProviderReviewsSummary(
  accessToken: string,
  providerId: string,
): Promise<ReviewsSummary> {
  if (USE_MOCK) {
    return mockGetProviderReviewsSummary(providerId);
  }

  const raw = await apiFetchAuth<RawReviewsSummary>(
    REVIEWS_ROUTES.summary(providerId),
    accessToken,
    { method: "GET" },
  );

  return mapReviewsSummary(raw);
}
