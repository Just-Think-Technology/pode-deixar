import { apiFetchAuth } from "@/api/client";
import type { ServiceImage } from "@/lib/auth/types";

export async function uploadServiceImage(
  accessToken: string,
  serviceId: string,
  file: File,
): Promise<ServiceImage> {
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const res = await fetch(`${baseUrl}/providers/me/services/${serviceId}/images`, {
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
    `/providers/me/services/${serviceId}/images`,
    accessToken,
  );
}

export async function deleteServiceImage(
  accessToken: string,
  serviceId: string,
  imageId: string,
): Promise<void> {
  await apiFetchAuth<void>(
    `/providers/me/services/${serviceId}/images/${imageId}`,
    accessToken,
    { method: "DELETE" },
  );
}
