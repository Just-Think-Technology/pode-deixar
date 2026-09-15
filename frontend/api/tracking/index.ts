// Tracking API — contract detail, status transitions and review fetchers

import { apiFetchAuth } from "@/api/client";
import type {
  ContractTracking,
  SubmitReviewInput,
  SubmitReviewResult,
  TrackingRole,
} from "@/lib/tracking/types";
import {
  getMockContractTracking,
  mockFinishService,
  mockStartService,
  mockSubmitReview,
} from "@/mock/tracking";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const TRACKING_ROUTES = {
  detail: (orderId: string) => `/services/${orderId}/tracking`,
  start: (orderId: string) => `/services/me/${orderId}/start`,
  finish: (orderId: string) => `/services/me/${orderId}/finish`,
  createReview: "/reviews",
  orderReviews: (orderId: string) => `/reviews/service-order/${orderId}`,
} as const;

export function getContractTracking(
  accessToken: string,
  orderId: string,
  role: TrackingRole,
): Promise<ContractTracking> {
  if (USE_MOCK) {
    const tracking = getMockContractTracking(orderId, role);
    if (!tracking) {
      throw new Error("Contratação não encontrada.");
    }
    return Promise.resolve(tracking);
  }

  return apiFetchAuth<ContractTracking>(
    TRACKING_ROUTES.detail(orderId),
    accessToken,
    { method: "GET" },
  );
}

export function startTrackedService(
  accessToken: string,
  orderId: string,
): Promise<ContractTracking> {
  if (USE_MOCK) {
    return Promise.resolve(mockStartService(orderId));
  }

  return apiFetchAuth<ContractTracking>(
    TRACKING_ROUTES.start(orderId),
    accessToken,
    { method: "POST" },
  );
}

export function finishTrackedService(
  accessToken: string,
  orderId: string,
  input: { photoCount: number; observations: string | null },
): Promise<ContractTracking> {
  if (USE_MOCK) {
    return Promise.resolve(
      mockFinishService(orderId, input.photoCount, input.observations),
    );
  }

  return apiFetchAuth<ContractTracking>(
    TRACKING_ROUTES.finish(orderId),
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        photoCount: input.photoCount,
        observations: input.observations,
      }),
    },
  );
}

export function submitTrackedReview(
  accessToken: string,
  orderId: string,
  input: SubmitReviewInput,
): Promise<SubmitReviewResult> {
  if (USE_MOCK) {
    return Promise.resolve(mockSubmitReview(orderId, input));
  }

  return apiFetchAuth<SubmitReviewResult>(
    TRACKING_ROUTES.createReview,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        serviceOrderId: orderId,
        rating: input.rating,
        ...(input.comment ? { comment: input.comment } : {}),
      }),
    },
  );
}
