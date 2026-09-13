"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/api/client";
import {
  completeWorkerOrder,
  deleteWorkerOrderPhoto,
  getWorkerOrderDetail,
  uploadWorkerOrderPhoto,
} from "@/api/worker/orders";
import { getAccessToken, refreshAuthSession } from "@/lib/auth/session.server";
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

export async function getCompletionOrderAction(
  orderId: string,
): Promise<CompletionOrder | null> {
  if (USE_MOCK) {
    return getMockCompletionOrder(orderId);
  }

  return withTokenRefresh((token) => getWorkerOrderDetail(token, orderId));
}

export async function getCompletionHistoryAction(
  orderId: string,
): Promise<CompletionHistory | null> {
  if (USE_MOCK) {
    return getMockCompletionHistoryWithFallback(orderId);
  }

  // O backend ainda não expõe o histórico de conclusão (JTT-106 §7 do plano).
  return null;
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
  return withTokenRefresh((token) =>
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

  return withTokenRefresh((token) =>
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

  const history = await withTokenRefresh((token) =>
    completeWorkerOrder(token, orderId, { observations: observations.trim() }),
  );
  revalidatePath("/worker/agenda");
  revalidatePath(`/worker/orders/${orderId}/complete`);
  return history;
}
