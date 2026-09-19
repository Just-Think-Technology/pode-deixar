// Tracking actions — contract lookup and transitions —

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
  getAuthSession,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import type {
  ContractTracking,
  SubmitReviewInput,
  SubmitReviewResult,
  TrackingRole,
} from "@/lib/tracking/types";
import { validateReviewInput } from "@/lib/tracking/validation";

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

// Fail-fast role assertion — the backend remains the real enforcement,
// this only surfaces a clear message before the round trip.
async function requireTrackingRole(role: TrackingRole): Promise<void> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (session.user.role !== role) {
    throw new Error(
      role === "PROVIDER"
        ? "Apenas o prestador pode executar esta ação."
        : "Apenas o cliente pode executar esta ação.",
    );
  }
}

export async function getContractTrackingAction(
  orderId: string,
  role: TrackingRole,
): Promise<ContractTracking | null> {
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
  await requireTrackingRole("PROVIDER");

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
  await requireTrackingRole("PROVIDER");

  const normalized = observations.trim() ? observations.trim() : null;

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
  await requireTrackingRole("CLIENT");

  const validation = validateReviewInput(input);
  if (!validation.ok) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError ?? "Não foi possível enviar a avaliação.");
  }

  const payload: SubmitReviewInput = {
    rating: input.rating,
    ...(input.comment?.trim() ? { comment: input.comment.trim() } : {}),
  };

  const review = await withTokenRefresh((token) =>
    submitTrackedReview(token, orderId, payload),
  );
  revalidateTracking(orderId);
  return review;
}