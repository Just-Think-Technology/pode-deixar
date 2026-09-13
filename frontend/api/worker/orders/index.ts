import { apiFetchAuth } from "@/api/client";
import type {
  CompleteOrderInput,
  CompleteOrderResult,
  CompletionOrder,
  CompletionPhoto,
} from "@/lib/worker/orders/types";
import {
  getMockCompletionOrder,
  mockCompleteOrder,
  mockUploadCompletionPhoto,
} from "@/mock/worker/completion";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const WORKER_ORDER_ROUTES = {
  detail: (orderId: string) => `/services/${orderId}`,
  complete: (orderId: string) => `/services/me/${orderId}/complete`,
  uploadPhoto: (orderId: string) =>
    `/services/me/${orderId}/completion-photos`,
  deletePhoto: (orderId: string, photoId: string) =>
    `/services/me/${orderId}/completion-photos/${photoId}`,
} as const;

export function getWorkerOrderDetail(
  accessToken: string,
  orderId: string,
): Promise<CompletionOrder> {
  if (USE_MOCK) {
    const order = getMockCompletionOrder(orderId);
    if (!order) {
      throw new Error("Serviço não encontrado.");
    }
    return Promise.resolve(order);
  }

  return apiFetchAuth<CompletionOrder>(
    WORKER_ORDER_ROUTES.detail(orderId),
    accessToken,
    { method: "GET" },
  );
}

export function uploadWorkerOrderPhoto(
  accessToken: string,
  orderId: string,
  formData: FormData,
): Promise<CompletionPhoto> {
  if (USE_MOCK) {
    const previewUrl = String(formData.get("previewUrl") ?? "");
    return Promise.resolve(mockUploadCompletionPhoto(orderId, previewUrl));
  }

  return apiFetchAuth<CompletionPhoto>(
    WORKER_ORDER_ROUTES.uploadPhoto(orderId),
    accessToken,
    { method: "POST", body: formData },
  );
}

export function deleteWorkerOrderPhoto(
  accessToken: string,
  orderId: string,
  photoId: string,
): Promise<void> {
  if (USE_MOCK) {
    return Promise.resolve();
  }

  return apiFetchAuth<void>(
    WORKER_ORDER_ROUTES.deletePhoto(orderId, photoId),
    accessToken,
    { method: "DELETE" },
  );
}

export function completeWorkerOrder(
  accessToken: string,
  orderId: string,
  input: CompleteOrderInput,
): Promise<CompleteOrderResult> {
  if (USE_MOCK) {
    const observations = input.observations?.trim()
      ? input.observations.trim()
      : null;
    return Promise.resolve(mockCompleteOrder(orderId, observations));
  }

  return apiFetchAuth<CompleteOrderResult>(
    WORKER_ORDER_ROUTES.complete(orderId),
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ observations: input.observations ?? null }),
    },
  );
}
