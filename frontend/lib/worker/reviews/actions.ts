// Worker reviews actions — received reviews, replies, and reports with mock fallback

"use server";

import { ApiError } from "@/api/client";
import {
  getMyReviews,
  replyToReview,
  reportReview,
} from "@/api/worker/reviews";
import {
  getAccessToken,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import type {
  MyReview,
  ReportReviewPayload,
  ReviewResponse,
} from "@/lib/worker/reviews/types";
import {
  mockGetMyReviews,
  mockReplyToReview,
  mockReportReview,
} from "@/mock/worker/reviews";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

async function withTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    return await fn(token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const refreshed = await refreshAuthSession();
      if (!refreshed?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return await fn(refreshed.access_token);
    }
    throw err;
  }
}

export async function getMyReviewsAction(): Promise<MyReview[]> {
  if (USE_MOCK) {
    return mockGetMyReviews();
  }

  try {
    return await withTokenRefresh((token) => getMyReviews(token));
  } catch (err) {
    if (!USE_MOCK) throw err;
    if (
      err instanceof ApiError &&
      (err.status === 404 ||
        err.status === 501 ||
        err.status === 502 ||
        err.status === 503)
    ) {
      return mockGetMyReviews();
    }
    throw err;
  }
}

export async function replyToReviewAction(
  reviewId: string,
  message: string,
): Promise<ReviewResponse> {
  if (USE_MOCK) {
    const updated = mockReplyToReview(reviewId, message);

    return (
      updated?.response ?? {
        message,
        createdAt: new Date().toISOString(),
      }
    );
  }

  try {
    return await withTokenRefresh((token) =>
      replyToReview(token, reviewId, { message }),
    );
  } catch (err) {
    if (!USE_MOCK) throw err;
    if (
      err instanceof ApiError &&
      (err.status === 404 ||
        err.status === 501 ||
        err.status === 502 ||
        err.status === 503)
    ) {
      const updated = mockReplyToReview(reviewId, message);

      return (
        updated?.response ?? {
          message,
          createdAt: new Date().toISOString(),
        }
      );
    }
    throw err;
  }
}

export async function reportReviewAction(
  reviewId: string,
  payload: ReportReviewPayload,
): Promise<void> {
  if (USE_MOCK) {
    mockReportReview(reviewId, payload);
    return;
  }

  try {
    await withTokenRefresh((token) => reportReview(token, reviewId, payload));
  } catch (err) {
    if (!USE_MOCK) throw err;
    if (
      err instanceof ApiError &&
      (err.status === 404 ||
        err.status === 501 ||
        err.status === 502 ||
        err.status === 503)
    ) {
      mockReportReview(reviewId, payload);
      return;
    }
    throw err;
  }
}
