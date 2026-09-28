// Provider reviews mappers — raw payload normalization and pt-BR formatting

import type {
  ProviderReview,
  RawProviderReview,
  RawReviewResponse,
  RawReviewsPage,
  RawReviewsSummary,
  ReviewDistribution,
  ReviewResponse,
  ReviewsPage,
  ReviewsSummary,
} from "./types";

const ANONYMOUS_REVIEWER = "Cliente";

export const EMPTY_DISTRIBUTION: ReviewDistribution = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

export function toDisplayName(fullName: string | null | undefined): string {
  const normalized = fullName?.trim();

  if (!normalized) {
    return ANONYMOUS_REVIEWER;
  }

  const parts = normalized.split(/\s+/);

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function formatAverage(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatReviewDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function mapReviewResponse(
  raw: RawReviewResponse | undefined,
): ReviewResponse | null {
  if (!raw) {
    return null;
  }

  return { message: raw.message, createdAt: raw.created_at };
}

export function mapProviderReview(raw: RawProviderReview): ProviderReview {
  const rawName =
    raw.reviewer?.display_name ?? raw.reviewer?.complete_name ?? null;

  return {
    id: raw.id,
    rating: raw.rating,
    comment: raw.comment ?? null,
    createdAt: raw.created_at,
    reviewer: {
      displayName: toDisplayName(rawName),
      avatarUrl: raw.reviewer?.avatar_url ?? null,
    },
    response: mapReviewResponse(raw.response),
  };
}

export function mapReviewsPage(
  raw: RawReviewsPage<RawProviderReview>,
): ReviewsPage<ProviderReview> {
  return {
    data: raw.data.map(mapProviderReview),
    meta: {
      total: raw.meta.total,
      page: raw.meta.page,
      limit: raw.meta.limit,
      hasMore: raw.meta.hasMore,
    },
  };
}

export function mapReviewsSummary(raw: RawReviewsSummary): ReviewsSummary {
  return {
    average: raw.average,
    total: raw.total,
    distribution: {
      1: raw.distribution["1"] ?? 0,
      2: raw.distribution["2"] ?? 0,
      3: raw.distribution["3"] ?? 0,
      4: raw.distribution["4"] ?? 0,
      5: raw.distribution["5"] ?? 0,
    },
  };
}

export function buildLocalSummary(
  rating: number,
  totalReviews: number,
): ReviewsSummary {
  if (totalReviews <= 0) {
    return { average: null, total: 0, distribution: { ...EMPTY_DISTRIBUTION } };
  }

  return {
    average: rating,
    total: totalReviews,
    distribution: { ...EMPTY_DISTRIBUTION },
  };
}
