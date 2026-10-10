// Friendly errors — centralized API error interpretation for the UI
//
// Pipeline: technical API error → classify → sanitize → friendly message.
// Screens consume getFriendlyMessage / toFriendlyError / shouldOfferRetry
// instead of interpreting status codes or backend payloads themselves.

import {
  extractBackendMessages,
  extractRawMessage,
  extractStatus,
} from "@/lib/errors/classify";
import {
  isTechnicalMessage,
  sanitizeMessage,
} from "@/lib/errors/sanitize";
import {
  GENERIC_FALLBACK,
  categoryForStatus,
  messageForStatus,
} from "@/lib/errors/messages";
import type {
  FriendlyError,
  ShowApiErrorOptions,
} from "@/lib/errors/types";

export type { FriendlyError, ShowApiErrorOptions };
export {
  mapApiErrorToFieldErrors,
  isEmailNotVerifiedError,
} from "@/lib/errors/field-errors";
export {
  shouldNotifySessionExpired,
  resetSessionNoticeGuard,
} from "@/lib/errors/session";

function readBody(error: unknown): unknown {
  if (!error || typeof error !== "object") return null;
  return (error as Record<string, unknown>).body ?? null;
}

/**
 * Builds the structured friendly error for any thrown value.
 *
 * @param error - ApiError, Error, string or unknown
 * @param options - Optional action context (e.g. "enviar a proposta")
 * @returns Structured friendly error
 */
export function toFriendlyError(
  error: unknown,
  options?: ShowApiErrorOptions,
): FriendlyError {
  const action = options?.action?.trim();

  if (typeof error === "string") {
    return {
      category: "unknown",
      message: action
        ? `Não foi possível ${action}. Tente novamente.`
        : error,
      status: null,
      retryable: false,
      fieldErrors: null,
    };
  }

  const status = extractStatus(error);
  const category = categoryForStatus(status);
  const retryable =
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    (status !== null && status >= 500);

  if (status === null || status < 400) {
    if (error instanceof Error) {
      // Frontend-authored errors (validation throws, guards) carry
      // intentional copy — keep the first line, blocking only bare
      // internal codes. Backend/network text always arrives with a
      // status via ApiError and goes through the full pipeline below.
      const firstLine = error.message.split("\n")[0]?.trim() ?? "";
      if (/^P\d{4}$/.test(firstLine)) {
        return {
          category: "unknown",
          message: action
            ? `Não foi possível ${action}. Tente novamente.`
            : GENERIC_FALLBACK,
          status: null,
          retryable: false,
          fieldErrors: null,
        };
      }
      return {
        category: "unknown",
        message: firstLine || GENERIC_FALLBACK,
        status: null,
        retryable: false,
        fieldErrors: null,
      };
    }
    if (typeof console !== "undefined" && error !== null && error !== undefined) {
      console.error("[friendly-error] Unrecognized error shape", error);
    }
    return {
      category: "unknown",
      message: action
        ? `Não foi possível ${action}. Tente novamente.`
        : GENERIC_FALLBACK,
      status: null,
      retryable: false,
      fieldErrors: null,
    };
  }

  const body = readBody(error);
  const candidates =
    body !== null && body !== undefined
      ? extractBackendMessages(body)
      : [];
  const rawMessage = extractRawMessage(error);
  if (rawMessage && !candidates.includes(rawMessage)) {
    candidates.unshift(rawMessage);
  }

  const businessMessage =
    candidates.find((candidate) => !isTechnicalMessage(candidate)) ??
    candidates[0] ??
    null;

  const baseMessage = messageForStatus(status, businessMessage);

  if (category === "validation" && businessMessage) {
    const safe = sanitizeMessage(businessMessage, baseMessage);
    if (safe !== baseMessage) {
      return {
        category,
        message: safe,
        status,
        retryable,
        fieldErrors: null,
      };
    }
  }

  if (action && (category === "server" || category === "unknown" || category === "connection")) {
    return {
      category,
      message: `Não foi possível ${action}. Tente novamente.`,
      status,
      retryable,
      fieldErrors: null,
    };
  }

  return { category, message: baseMessage, status, retryable, fieldErrors: null };
}

/**
 * Resolves the user-facing message for any thrown value.
 *
 * @param error - ApiError, Error, string or unknown
 * @param options - Optional action context
 * @returns Friendly PT-BR message
 */
export function getFriendlyMessage(
  error: unknown,
  options?: ShowApiErrorOptions,
): string {
  return toFriendlyError(error, options).message;
}

/**
 * Back-compat alias used across forms and toast helpers.
 *
 * @param error - Unknown thrown value
 * @returns Friendly PT-BR message
 */
export function getApiErrorMessage(error: unknown): string {
  return getFriendlyMessage(error);
}

/**
 * Indicates whether the UI should offer a retry action. Retry fits
 * temporary or communication failures — never validation or business
 * rule errors.
 *
 * @param error - Unknown thrown value
 * @returns True when retry makes sense
 */
export function shouldOfferRetry(error: unknown): boolean {
  return toFriendlyError(error).retryable;
}

/**
 * Logs technical details for development diagnosis without exposing
 * them in the UI. Call alongside showing the friendly message.
 *
 * @param scope - Feature scope (e.g. "quote-form")
 * @param error - Original error
 */
export function logTechnicalError(scope: string, error: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  console.error(`[${scope}]`, error);
}
