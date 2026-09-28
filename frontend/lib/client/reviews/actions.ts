// Client reviews actions — provider list and summary with mock fallback

"use server";

import { ApiError } from "@/api/client";
import {
  getProviderReviews,
  getProviderReviewsSummary,
  INITIAL_REVIEWS_LIMIT,
} from "@/api/client/reviews";
import { withServerTokenRefresh } from "@/lib/auth/server-token-refresh";
import type {
  ProviderReview,
  ReviewsPage,
  ReviewsSummary,
} from "@/lib/client/reviews/types";
import {
  mockGetProviderReviews,
  mockGetProviderReviewsSummary,
} from "@/mock/client/reviews";
import { mapProviderReview } from "@/lib/client/reviews/mappers";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function mockReviewsPage(
  providerId: string,
  page: number,
  limit: number,
): ReviewsPage<ProviderReview> {
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

function isFallbackError(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 404 ||
      err.status === 501 ||
      err.status === 502 ||
      err.status === 503)
  );
}

export async function getProviderReviewsAction(
  providerId: string,
  page = 1,
  limit = INITIAL_REVIEWS_LIMIT,
): Promise<ReviewsPage<ProviderReview>> {
  if (USE_MOCK) {
    return mockReviewsPage(providerId, page, limit);
  }

  try {
    return await withServerTokenRefresh((token) =>
      getProviderReviews(token, providerId, { page, limit }),
    );
  } catch (err) {
    if (!USE_MOCK) throw err;
    if (isFallbackError(err)) {
      return mockReviewsPage(providerId, page, limit);
    }
    throw err;
  }
}

export async function getProviderReviewsSummaryAction(
  providerId: string,
): Promise<ReviewsSummary> {
  if (USE_MOCK) {
    return mockGetProviderReviewsSummary(providerId);
  }

  try {
    return await withServerTokenRefresh((token) =>
      getProviderReviewsSummary(token, providerId),
    );
  } catch (err) {
    if (!USE_MOCK) throw err;
    if (isFallbackError(err)) {
      return mockGetProviderReviewsSummary(providerId);
    }
    throw err;
  }
}
