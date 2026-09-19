// Tracking validation — review input rules shared by client and server

import type { ValidationResult } from "@/lib/auth/types";
import type { SubmitReviewInput } from "@/lib/tracking/types";

export const MAX_REVIEW_COMMENT_LENGTH = 500;
export const MIN_REVIEW_RATING = 1;
export const MAX_REVIEW_RATING = 5;

// Bounds mirror the backend finish endpoint (multipart 1-10x5MB,
// observations up to 2000 chars) so the UI fails fast with the same message.
export const MAX_FINISH_PHOTOS = 10;
export const MAX_FINISH_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_FINISH_OBSERVATIONS_LENGTH = 2000;
export const ALLOWED_FINISH_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateReviewInput(input: SubmitReviewInput): ValidationResult {
  if (
    !Number.isInteger(input.rating) ||
    input.rating < MIN_REVIEW_RATING ||
    input.rating > MAX_REVIEW_RATING
  ) {
    return {
      ok: false,
      errors: { rating: "A nota deve ser um número de 1 a 5." },
    };
  }
  if (
    input.comment != null &&
    input.comment.trim().length > MAX_REVIEW_COMMENT_LENGTH
  ) {
    return {
      ok: false,
      errors: { comment: "O comentário deve ter no máximo 500 caracteres." },
    };
  }
  return { ok: true };
}

export function validateFinishInput(
  photos: File[],
  observations: string | null,
): ValidationResult {
  if (photos.length < 1) {
    return {
      ok: false,
      errors: {
        photos: "Adicione pelo menos uma foto para concluir o serviço.",
      },
    };
  }
  if (photos.length > MAX_FINISH_PHOTOS) {
    return {
      ok: false,
      errors: { photos: "O serviço pode ter no máximo 10 fotos." },
    };
  }
  for (const photo of photos) {
    if (
      !ALLOWED_FINISH_IMAGE_MIME.has(photo.type) ||
      photo.size > MAX_FINISH_PHOTO_BYTES
    ) {
      return {
        ok: false,
        errors: {
          photos: "Formato inválido. Permitidos: JPEG, PNG, WebP, GIF até 5MB.",
        },
      };
    }
  }
  if (
    observations != null &&
    observations.trim().length > MAX_FINISH_OBSERVATIONS_LENGTH
  ) {
    return {
      ok: false,
      errors: {
        observations: "Observações devem ter no máximo 2000 caracteres.",
      },
    };
  }
  return { ok: true };
}
