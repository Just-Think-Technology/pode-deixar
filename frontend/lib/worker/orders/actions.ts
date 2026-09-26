"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/api/client/http";
import {
  completeWorkerOrder,
  deleteWorkerOrderPhoto,
  getOrderPhotoViewUrl,
  getWorkerOrderCompletion,
  getWorkerOrderDetail,
  uploadWorkerOrderPhoto,
} from "@/api/worker/orders";
import { withServerTokenRefresh } from "@/lib/auth/server-token-refresh";
import { hasAllowedMagicBytes } from "@/lib/auth/image-validation";
import type {
  CompleteOrderResult,
  CompletionHistory,
  CompletionOrder,
  CompletionPhoto,
} from "@/lib/worker/orders/types";
import {
  ALLOWED_COMPLETION_IMAGE_MIME,
  MAX_COMPLETION_PHOTO_BYTES,
  validateCompleteOrder,
} from "@/lib/worker/orders/validation";
import {
  getMockCompletionHistoryWithFallback,
  getMockCompletionOrder,
  mockCompleteOrder,
  mockRemoveCompletionPhoto,
  mockUploadCompletionPhoto,
} from "@/mock/worker/completion";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getCompletionOrderAction(
  orderId: string,
): Promise<CompletionOrder | null> {
  if (USE_MOCK) {
    return getMockCompletionOrder(orderId);
  }

  return withServerTokenRefresh((token) => getWorkerOrderDetail(token, orderId));
}

export async function getCompletionHistoryAction(
  orderId: string,
): Promise<CompletionHistory | null> {
  if (USE_MOCK) {
    return getMockCompletionHistoryWithFallback(orderId);
  }

  try {
    return await withServerTokenRefresh((token) =>
      getWorkerOrderCompletion(token, orderId),
    );
  } catch (err) {
    // History only exists for COMPLETED orders; absence is not an error.
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function resolveOrderPhotoUrlAction(
  photoId: string,
): Promise<string> {
  // No shared server cache on purpose: presigned URLs grant
  // bearer-independent access, so they must not leak across users.
  // Callers cache per browser session instead.
  const result = await withServerTokenRefresh((token) =>
    getOrderPhotoViewUrl(token, photoId),
  );
  if (!result?.url) {
    throw new Error("Não foi possível carregar a foto. Tente novamente.");
  }
  return result.url;
}

async function validateCompletionFile(file: File): Promise<void> {
  if (file.size > MAX_COMPLETION_PHOTO_BYTES) {
    throw new Error("A imagem deve ter no máximo 5MB");
  }
  if (!ALLOWED_COMPLETION_IMAGE_MIME.has(file.type)) {
    throw new Error("Formato inválido. Permitidos: JPEG, PNG, WebP, GIF");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasAllowedMagicBytes(bytes, file.type)) {
    throw new Error("Formato inválido. Permitidos: JPEG, PNG, WebP, GIF");
  }
}

export async function uploadCompletionPhotoAction(
  orderId: string,
  formData: FormData,
  previewUrl: string,
): Promise<CompletionPhoto> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Nenhuma imagem enviada");
  }
  await validateCompletionFile(file);

  if (USE_MOCK) {
    return mockUploadCompletionPhoto(orderId, previewUrl);
  }

  const uploadData = new FormData();
  uploadData.append("file", file);
  return withServerTokenRefresh((token) =>
    uploadWorkerOrderPhoto(token, orderId, uploadData),
  );
}

export async function removeCompletionPhotoAction(
  orderId: string,
  photoId: string,
): Promise<void> {
  if (USE_MOCK) {
    mockRemoveCompletionPhoto(orderId, photoId);
    return;
  }

  return withServerTokenRefresh((token) =>
    deleteWorkerOrderPhoto(token, orderId, photoId),
  );
}

export async function completeOrderAction(
  orderId: string,
  photoCount: number,
  observations: string,
): Promise<CompleteOrderResult> {
  const validation = validateCompleteOrder(photoCount, observations);
  if (!validation.ok) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError ?? "Não foi possível concluir o serviço.");
  }

  const normalized = observations.trim() ? observations.trim() : null;

  if (USE_MOCK) {
    const history = mockCompleteOrder(orderId, normalized);
    revalidatePath("/worker/agenda");
    return history;
  }

  const history = await withServerTokenRefresh((token) =>
    completeWorkerOrder(token, orderId, { observations: observations.trim() }),
  );
  revalidatePath("/worker/agenda");
  revalidatePath(`/worker/orders/${orderId}/complete`);
  return history;
}
