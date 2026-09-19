import { apiFetchAuth } from "@/api/client";
import type {
  CompleteOrderInput,
  CompleteOrderResult,
  CompletionHistory,
  CompletionOrder,
  CompletionPhoto,
} from "@/lib/worker/orders/types";

export const WORKER_ORDER_ROUTES = {
  detail: (orderId: string) => `/services/${orderId}`,
  completion: (orderId: string) => `/services/me/${orderId}/completion`,
  complete: (orderId: string) => `/services/me/${orderId}/complete`,
  uploadPhoto: (orderId: string) =>
    `/services/me/${orderId}/completion-photos`,
  deletePhoto: (orderId: string, photoId: string) =>
    `/services/me/${orderId}/completion-photos/${photoId}`,
  photoView: (photoId: string) => `/services/photos/${photoId}/view`,
} as const;

export function getWorkerOrderDetail(
  accessToken: string,
  orderId: string,
): Promise<CompletionOrder> {
  return apiFetchAuth<CompletionOrder>(
    WORKER_ORDER_ROUTES.detail(orderId),
    accessToken,
    { method: "GET" },
  );
}

export function getWorkerOrderCompletion(
  accessToken: string,
  orderId: string,
): Promise<CompletionHistory> {
  return apiFetchAuth<CompletionHistory>(
    WORKER_ORDER_ROUTES.completion(orderId),
    accessToken,
    { method: "GET" },
  );
}

export type OrderPhotoViewResult = {
  url: string;
};

export function getOrderPhotoViewUrl(
  accessToken: string,
  photoId: string,
): Promise<OrderPhotoViewResult> {
  return apiFetchAuth<OrderPhotoViewResult>(
    WORKER_ORDER_ROUTES.photoView(photoId),
    accessToken,
    { method: "GET" },
  );
}

// Backend returns a single object for one file and an array for many.
export function normalizeUploadedPhotos(
  payload: CompletionPhoto | CompletionPhoto[],
): CompletionPhoto[] {
  return Array.isArray(payload) ? payload : [payload];
}
export function uploadWorkerOrderPhoto(
  accessToken: string,
  orderId: string,
  formData: FormData,
): Promise<CompletionPhoto> {
  return apiFetchAuth<CompletionPhoto | CompletionPhoto[]>(
    WORKER_ORDER_ROUTES.uploadPhoto(orderId),
    accessToken,
    { method: "POST", body: formData },
  ).then((payload) => {
    const photo = normalizeUploadedPhotos(payload)[0];
    if (!photo) {
      throw new Error("Não foi possível enviar a foto. Tente novamente.");
    }
    return photo;
  });
}

export function deleteWorkerOrderPhoto(
  accessToken: string,
  orderId: string,
  photoId: string,
): Promise<void> {
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
  return apiFetchAuth<CompleteOrderResult>(
    WORKER_ORDER_ROUTES.complete(orderId),
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ observations: input.observations ?? null }),
    },
  );
}
