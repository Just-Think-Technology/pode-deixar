// Worker service images API — image upload fetcher

import { apiFetchAuth, getApiBaseUrl } from "@/api/client/http";
import type { ServiceImage } from "@/lib/auth/types";

export const SERVICE_IMAGES_ROUTES = {
  upload: (serviceId: string) => `/providers/me/services/${serviceId}/images`,
  byId: (serviceId: string, imageId: string) =>
    `/providers/me/services/${serviceId}/images/${imageId}`,
} as const;

export async function uploadServiceImage(
  accessToken: string,
  serviceId: string,
  file: File,
): Promise<ServiceImage> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${getApiBaseUrl()}${SERVICE_IMAGES_ROUTES.upload(serviceId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : "Erro ao enviar imagem";
    throw new Error(message);
  }

  return data as ServiceImage;
}

export async function listServiceImages(
  accessToken: string,
  serviceId: string,
): Promise<ServiceImage[]> {
  return apiFetchAuth<ServiceImage[]>(
    SERVICE_IMAGES_ROUTES.upload(serviceId),
    accessToken,
  );
}

export async function deleteServiceImage(
  accessToken: string,
  serviceId: string,
  imageId: string,
): Promise<void> {
  await apiFetchAuth<void>(
    SERVICE_IMAGES_ROUTES.byId(serviceId, imageId),
    accessToken,
    { method: "DELETE" },
  );
}
