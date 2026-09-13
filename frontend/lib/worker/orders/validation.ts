import type { ValidationResult } from "@/lib/auth/types";

export const MAX_COMPLETION_PHOTOS = 10;
export const MAX_COMPLETION_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_OBSERVATIONS_LENGTH = 2000;

export const ALLOWED_COMPLETION_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function fail(errors: Record<string, string>): ValidationResult {
  return { ok: false, errors };
}

export function validateCompletionPhoto(file: File): ValidationResult {
  if (file.size > MAX_COMPLETION_PHOTO_BYTES) {
    return fail({ photo: "A imagem deve ter no máximo 5MB" });
  }
  if (!ALLOWED_COMPLETION_IMAGE_MIME.has(file.type)) {
    return fail({
      photo: "Formato inválido. Permitidos: JPEG, PNG, WebP, GIF",
    });
  }
  return { ok: true };
}

export function validateCompletionPhotoCount(count: number): ValidationResult {
  if (count < 1) {
    return fail({
      photos: "Adicione pelo menos uma foto para concluir o serviço.",
    });
  }
  if (count > MAX_COMPLETION_PHOTOS) {
    return fail({ photos: "O serviço pode ter no máximo 10 fotos." });
  }
  return { ok: true };
}

export function validateCompletionObservations(
  observations: string,
): ValidationResult {
  if (observations.trim().length > MAX_OBSERVATIONS_LENGTH) {
    return fail({
      observations: "Observações devem ter no máximo 2000 caracteres",
    });
  }
  return { ok: true };
}

export function validateCompleteOrder(
  photoCount: number,
  observations: string,
): ValidationResult {
  const errors: Record<string, string> = {};

  const countResult = validateCompletionPhotoCount(photoCount);
  if (!countResult.ok) {
    Object.assign(errors, countResult.errors);
  }

  const observationsResult = validateCompletionObservations(observations);
  if (!observationsResult.ok) {
    Object.assign(errors, observationsResult.errors);
  }

  return Object.keys(errors).length > 0 ? fail(errors) : { ok: true };
}
