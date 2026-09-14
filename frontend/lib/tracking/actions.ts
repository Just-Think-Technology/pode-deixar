// Tracking actions — contract lookup and transitions with mock fallback

"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/api/client";
import {
  finishTrackedService,
  getContractTracking,
  startTrackedService,
  submitTrackedReview,
} from "@/api/tracking";
import {
  getAccessToken,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import type {
  ContractTracking,
  SubmitReviewInput,
  SubmitReviewResult,
  TrackingRole,
} from "@/lib/tracking/types";
import { validateReviewInput } from "@/lib/tracking/validation";
import {
  getMockContractTracking,
  mockFinishService,
  mockStartService,
  mockSubmitReview,
} from "@/mock/tracking";

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

function revalidateTracking(orderId: string): void {
  revalidatePath(`/client/orders/${orderId}/tracking`);
  revalidatePath(`/worker/orders/${orderId}/tracking`);
}

export async function getContractTrackingAction(
  orderId: string,
  role: TrackingRole,
): Promise<ContractTracking | null> {
  if (USE_MOCK) {
    return getMockContractTracking(orderId, role);
  }

  try {
    return await withTokenRefresh((token) =>
      getContractTracking(token, orderId, role),
    );
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 400 || err.status === 403 || err.status === 404)
    ) {
      return null;
    }
    throw err;
  }
}

export async function startServiceAction(
  orderId: string,
): Promise<ContractTracking> {
  if (USE_MOCK) {
    const tracking = mockStartService(orderId);
    revalidateTracking(orderId);
    return tracking;
  }

  const tracking = await withTokenRefresh((token) =>
    startTrackedService(token, orderId),
  );
  revalidateTracking(orderId);
  return tracking;
}

export async function finishServiceAction(
  orderId: string,
  photoCount: number,
  observations: string,
): Promise<ContractTracking> {
  const normalized = observations.trim() ? observations.trim() : null;

  if (USE_MOCK) {
    const tracking = mockFinishService(orderId, photoCount, normalized);
    revalidateTracking(orderId);
    return tracking;
  }

  const tracking = await withTokenRefresh((token) =>
    finishTrackedService(token, orderId, {
      photoCount,
      observations: normalized,
    }),
  );
  revalidateTracking(orderId);
  return tracking;
}

export async function submitReviewAction(
  orderId: string,
  input: SubmitReviewInput,
): Promise<SubmitReviewResult> {
  const validation = validateReviewInput(input);
  if (!validation.ok) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError ?? "Não foi possível enviar a avaliação.");
  }

  const payload: SubmitReviewInput = {
    rating: input.rating,
    ...(input.comment?.trim() ? { comment: input.comment.trim() } : {}),
  };

  if (USE_MOCK) {
    const review = mockSubmitReview(orderId, payload);
    revalidateTracking(orderId);
    return review;
  }

  const review = await withTokenRefresh((token) =>
    submitTrackedReview(token, orderId, payload),
  );
  revalidateTracking(orderId);
  return review;
}
