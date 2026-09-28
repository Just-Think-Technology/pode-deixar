// Worker reviews API — received reviews, replies, and reports fetchers

import { apiFetchAuth } from "@/api/client";
import {
  mapProviderReview,
  mapReviewResponse,
} from "@/lib/client/reviews/mappers";
import type {
  RawReviewsPage,
  ReviewsPage,
} from "@/lib/client/reviews/types";
import type {
  MyReview,
  RawMyReview,
  ReplyToReviewPayload,
  ReportReviewPayload,
  ReportStatus,
  ReviewResponse,
} from "@/lib/worker/reviews/types";
import {
  mockGetMyReviews,
  mockReplyToReview,
  mockReportReview,
} from "@/mock/worker/reviews";

export const WORKER_REVIEWS_ROUTES = {
  received: (page: number, limit: number) =>
    `/reviews/received?page=${page}&limit=${limit}`,
  response: (reviewId: string) => `/reviews/${reviewId}/response`,
  reports: (reviewId: string) => `/reviews/${reviewId}/reports`,
} as const;

export const RECEIVED_REVIEWS_PAGE_SIZE = 10;

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function mapReportStatus(raw: RawMyReview): ReportStatus {
  return raw.report_status ?? "NONE";
}

export function mapMyReview(raw: RawMyReview): MyReview {
  return {
    ...mapProviderReview(raw),
    response: mapReviewResponse(raw.response ?? null),
    reportStatus: mapReportStatus(raw),
  };
}

export type ReceivedReviewsQuery = {
  page?: number;
  limit?: number;
};

export async function getMyReviews(
  accessToken: string,
  query: ReceivedReviewsQuery = {},
): Promise<ReviewsPage<MyReview>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? RECEIVED_REVIEWS_PAGE_SIZE;

  if (USE_MOCK) {
    const all = mockGetMyReviews();
    const start = (page - 1) * limit;
    const slice = all.slice(start, start + limit);

    return {
      data: slice,
      meta: {
        total: all.length,
        page,
        limit,
        hasMore: start + limit < all.length,
      },
    };
  }

  const raw = await apiFetchAuth<RawReviewsPage<RawMyReview>>(
    WORKER_REVIEWS_ROUTES.received(page, limit),
    accessToken,
    { method: "GET" },
  );

  return {
    data: raw.data.map(mapMyReview),
    meta: {
      total: raw.meta.total,
      page: raw.meta.page,
      limit: raw.meta.limit,
      hasMore: raw.meta.hasMore,
    },
  };
}

function toReviewResponse(raw: {
  message: string;
  created_at: string;
}): ReviewResponse {
  return { message: raw.message, createdAt: raw.created_at };
}

export async function replyToReview(
  accessToken: string,
  reviewId: string,
  payload: ReplyToReviewPayload,
): Promise<ReviewResponse> {
  if (USE_MOCK) {
    const updated = mockReplyToReview(reviewId, payload.message);

    return (
      updated?.response ?? {
        message: payload.message,
        createdAt: new Date().toISOString(),
      }
    );
  }

  const raw = await apiFetchAuth<{ message: string; created_at: string }>(
    WORKER_REVIEWS_ROUTES.response(reviewId),
    accessToken,
    { method: "POST", body: JSON.stringify(payload) },
  );

  return toReviewResponse(raw);
}

export async function updateReviewResponse(
  accessToken: string,
  reviewId: string,
  payload: ReplyToReviewPayload,
): Promise<ReviewResponse> {
  if (USE_MOCK) {
    const updated = mockReplyToReview(reviewId, payload.message);

    return (
      updated?.response ?? {
        message: payload.message,
        createdAt: new Date().toISOString(),
      }
    );
  }

  const raw = await apiFetchAuth<{ message: string; created_at: string }>(
    WORKER_REVIEWS_ROUTES.response(reviewId),
    accessToken,
    { method: "PATCH", body: JSON.stringify(payload) },
  );

  return toReviewResponse(raw);
}

export async function reportReview(
  accessToken: string,
  reviewId: string,
  payload: ReportReviewPayload,
): Promise<void> {
  if (USE_MOCK) {
    mockReportReview(reviewId, payload);
    return;
  }

  await apiFetchAuth<void>(
    WORKER_REVIEWS_ROUTES.reports(reviewId),
    accessToken,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
