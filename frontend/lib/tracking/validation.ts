// Tracking validation — review input rules shared by client and server

import type { ValidationResult } from "@/lib/auth/types";
import type { SubmitReviewInput } from "@/lib/tracking/types";

export const MAX_REVIEW_COMMENT_LENGTH = 500;
export const MIN_REVIEW_RATING = 1;
export const MAX_REVIEW_RATING = 5;

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
