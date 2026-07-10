"use server";

import { getAccessToken } from "@/lib/auth/session.server";
import { getApiBaseUrl } from "@/api/client";

export async function uploadServiceImageAction(
  serviceId: string,
  formData: FormData,
) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const res = await fetch(
    `${getApiBaseUrl()}/providers/me/services/${serviceId}/images`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  const data = await res.json();

  if (!res.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : "Erro ao enviar imagem";
    throw new Error(message);
  }

  return data;
}

export async function deleteServiceImageAction(
  serviceId: string,
  imageId: string,
) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const res = await fetch(
    `${getApiBaseUrl()}/providers/me/services/${serviceId}/images/${imageId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      typeof data?.message === "string"
        ? data.message
        : "Erro ao remover imagem";
    throw new Error(message);
  }
}
