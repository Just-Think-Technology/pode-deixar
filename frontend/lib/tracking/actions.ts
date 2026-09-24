// Tracking actions — contract lookup and transitions with mock fallback

"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/api/client/http";
import {
  finishTrackedService,
  getContractTracking,
  getEvidencePhotoViewUrl,
  startTrackedService,
  submitTrackedReview,
} from "@/api/tracking";
import {
  getAuthSession,
} from "@/lib/auth/session.server";
import { withTokenRefresh } from "@/api/client/with-token-refresh";
import type {
  ContractTracking,
  SubmitReviewInput,
  SubmitReviewResult,
  TrackingRole,
} from "@/lib/tracking/types";
import { validateFinishInput, validateReviewInput } from "@/lib/tracking/validation";
import {
  getMockContractTracking,
  mockFinishService,
  mockStartService,
  mockSubmitReview,
} from "@/mock/tracking";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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
  if (USE_MOCK) {
    return getMockContractTracking(orderId, role);
  }

  try {
    return await withTokenRefresh(async (token) => {
      const tracking = await getContractTracking(token, orderId, role);
      return resolveEvidencePhotoUrls(token, tracking);
    });
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

// The backend exposes evidence photos as authenticated view endpoints
// (/api/services/photos/:id/view) returning { url: presigned }. Resolve them
// server-side so <img> receives directly renderable https URLs. Failures keep
// the original URL instead of breaking the whole tracking load.
async function resolveEvidencePhotoUrls(
  token: string,
  tracking: ContractTracking,
): Promise<ContractTracking> {
  const photos = tracking.evidence?.photos;
  if (!photos || photos.length === 0) {
    return tracking;
  }
  const resolved = await Promise.all(
    photos.map(async (photo) => {
      try {
        const { url } = await getEvidencePhotoViewUrl(token, photo.id);
        return { ...photo, url };
      } catch {
        return photo;
      }
    }),
  );
  return {
    ...tracking,
    evidence: tracking.evidence ? { ...tracking.evidence, photos: resolved } : null,
  };
}

export async function startServiceAction(
  orderId: string,
): Promise<ContractTracking> {
  await requireTrackingRole("PROVIDER");

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
  photos: File[],
  observations: string,
): Promise<ContractTracking> {
  await requireTrackingRole("PROVIDER");

  const normalized = observations.trim() ? observations.trim() : null;
  const validation = validateFinishInput(photos, normalized);
  if (!validation.ok) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError ?? "Não foi possível concluir o serviço.");
  }

  if (USE_MOCK) {
    const tracking = mockFinishService(orderId, photos.length, normalized);
    revalidateTracking(orderId);
    return tracking;
  }

  const tracking = await withTokenRefresh((token) =>
    finishTrackedService(token, orderId, {
      photos,
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
