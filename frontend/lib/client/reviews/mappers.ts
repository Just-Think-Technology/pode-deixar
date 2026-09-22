// Provider reviews mappers — raw payload normalization and pt-BR formatting

import type {
  ProviderReview,
  RawProviderReview,
  ReviewDistribution,
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
