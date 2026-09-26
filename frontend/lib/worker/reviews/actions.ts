// Worker reviews actions — received reviews, replies, and reports with mock fallback

"use server";

import { ApiError } from "@/api/client";
import {
  getMyReviews,
  replyToReview,
  reportReview,
} from "@/api/worker/reviews";
import { withServerTokenRefresh } from "@/lib/auth/server-token-refresh";
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

export async function getMyReviewsAction(): Promise<MyReview[]> {
  if (USE_MOCK) {
    return mockGetMyReviews();
  }

  try {
    return await withServerTokenRefresh((token) => getMyReviews(token));
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
    return await withServerTokenRefresh((token) =>
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
    await withServerTokenRefresh((token) => reportReview(token, reviewId, payload));
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
