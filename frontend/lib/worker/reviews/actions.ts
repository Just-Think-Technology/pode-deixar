// Worker reviews actions — received reviews, replies, and reports with mock fallback

"use server";

import { ApiError } from "@/api/client";
import {
  getMyReviews,
  replyToReview,
  reportReview,
  updateReviewResponse,
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

const RECEIVED_FIRST_PAGE_LIMIT = 50;

export async function getMyReviewsAction(): Promise<MyReview[]> {
  if (USE_MOCK) {
    return mockGetMyReviews();
  }

  try {
    const page = await withServerTokenRefresh((token) =>
      getMyReviews(token, { page: 1, limit: RECEIVED_FIRST_PAGE_LIMIT }),
    );
    return page.data;
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
    return await withServerTokenRefresh(async (token) => {
      try {
        return await replyToReview(token, reviewId, { message });
      } catch (err) {
        // Response created elsewhere (e.g. another session) — fall back to
        // updating so the worker intent ("my response is this message") holds
        if (err instanceof ApiError && err.status === 409) {
          return await updateReviewResponse(token, reviewId, { message });
        }
        throw err;
      }
    });
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
