// Auth image actions — avatar and service image server actions

"use server";

import { getAccessToken } from "@/lib/auth/session.server";
import { getApiBaseUrl } from "@/api/client";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function hasAllowedMagicBytes(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mime === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  if (mime === "image/gif") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    );
  }
  return false;
}

export async function uploadServiceImageAction(
  serviceId: string,
  formData: FormData,
) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Nenhuma imagem enviada");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("A imagem deve ter no máximo 5MB");
  }
  if (!ALLOWED_IMAGE_MIME.has(file.type)) {
    throw new Error("Formato inválido. Permitidos: JPEG, PNG, WebP, GIF");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasAllowedMagicBytes(bytes, file.type)) {
    throw new Error("Formato inválido. Permitidos: JPEG, PNG, WebP, GIF");
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
