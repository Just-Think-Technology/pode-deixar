// Worker reviews API — received reviews, replies, and reports fetchers

import { apiFetchAuth } from "@/api/client";
import { mapProviderReview } from "@/lib/client/reviews/mappers";
import type {
  MyReview,
  RawMyReview,
  RawReviewResponse,
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
  received: "/reviews/received",
  response: (reviewId: string) => `/reviews/${reviewId}/response`,
  reports: (reviewId: string) => `/reviews/${reviewId}/reports`,
} as const;

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function mapReviewResponse(raw: RawReviewResponse): ReviewResponse | null {
  if (!raw) {
    return null;
  }

  return { message: raw.message, createdAt: raw.created_at };
}

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

export async function getMyReviews(accessToken: string): Promise<MyReview[]> {
  if (USE_MOCK) {
    return mockGetMyReviews();
  }

  const raw = await apiFetchAuth<RawMyReview[]>(
    WORKER_REVIEWS_ROUTES.received,
    accessToken,
    { method: "GET" },
  );

  return raw.map(mapMyReview);
}

export async function replyToReview(
  accessToken: string,
  reviewId: string,
  payload: ReplyToReviewPayload,
): Promise<ReviewResponse> {
  if (USE_MOCK) {
    const updated = mockReplyToReview(reviewId, payload.message);

    return updated?.response ?? { message: payload.message, createdAt: new Date().toISOString() };
  }

  const raw = await apiFetchAuth<{ message: string; created_at: string }>(
    WORKER_REVIEWS_ROUTES.response(reviewId),
    accessToken,
    { method: "POST", body: JSON.stringify(payload) },
  );

  return { message: raw.message, createdAt: raw.created_at };
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
