// Toast wrappers — standardized sonner helpers with durations and ApiError mapping

import { toast } from "sonner";
import {
  getFriendlyMessage,
  logTechnicalError,
} from "@/lib/errors";
import { FRIENDLY_MESSAGES } from "@/lib/errors/messages";
import type { ShowApiErrorOptions } from "@/lib/errors/types";

// --- Constants ---

const SUCCESS_DURATION = 3000;
const ERROR_DURATION = 5000;
const WARNING_DURATION = 4000;
const INFO_DURATION = 4000;

type ToastOptions = {
  description?: string;
};

// --- Internal helpers ---

/**
 * Resolves a user-facing message without leaking stack traces or internal codes.
 * Delegates to the centralized friendly-error layer, keeping this facade thin.
 */
function resolveMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  return getFriendlyMessage(error);
}

// --- Public API ---

/**
 * Shows a success toast that auto-closes after 3 seconds.
 *
 * @param message - User-facing success message in PT-BR
 * @param options - Optional description
 * @returns toast id
 */
export function showSuccess(
  message: string,
  options?: ToastOptions,
): string | number {
  return toast.success(message, {
    duration: SUCCESS_DURATION,
    description: options?.description,
  });
}

/**
 * Shows an error toast that auto-closes after 5 seconds.
 * Resolves any error shape via the centralized friendly-error layer and
 * keeps technical details in dev logs only.
 *
 * @param error - ApiError, Error, string or unknown
 * @param options - Optional action context (e.g. "enviar a proposta") or description
 * @returns toast id
 */
export function showError(
  error: unknown,
  options?: ShowApiErrorOptions & ToastOptions,
): string | number {
  logTechnicalError("toast", error);
  const message = getFriendlyMessage(error, { action: options?.action });
  return toast.error(message, {
    duration: ERROR_DURATION,
    description: options?.description,
  });
}

/**
 * Shows an API error toast scoped to a user action, e.g. "enviar a proposta"
 * renders "Não foi possível enviar a proposta. Tente novamente." for
 * server/connection failures.
 *
 * @param error - ApiError, Error or unknown
 * @param action - User action in infinitive PT-BR (e.g. "salvar as alterações")
 * @returns toast id
 */
export function showApiError(
  error: unknown,
  action: string,
): string | number {
  return showError(error, { action });
}

/**
 * Shows the session-expired toast. Callers combine this with
 * shouldNotifySessionExpired so concurrent 401s notify only once.
 *
 * @returns toast id
 */
export function showSessionExpired(): string | number {
  return toast.error(FRIENDLY_MESSAGES.unauthenticated, {
    duration: ERROR_DURATION,
  });
}

/**
 * Shows a warning toast.
 *
 * @param message - User-facing warning message in PT-BR
 * @param options - Optional description
 * @returns toast id
 */
export function showWarning(
  message: string,
  options?: ToastOptions,
): string | number {
  return toast.warning(message, {
    duration: WARNING_DURATION,
    description: options?.description,
  });
}

/**
 * Shows an info toast.
 *
 * @param message - User-facing info message in PT-BR
 * @param options - Optional description
 * @returns toast id
 */
export function showInfo(
  message: string,
  options?: ToastOptions,
): string | number {
  return toast.info(message, {
    duration: INFO_DURATION,
    description: options?.description,
  });
}

/**
 * Shows a loading toast with indefinite duration until updated.
 *
 * @param message - Loading message in PT-BR
 * @returns toast id for later updateToast
 */
export function showLoading(message: string): string | number {
  return toast.loading(message, { duration: Infinity });
}

/**
 * Updates a loading toast to success or error, dismissing the previous one.
 *
 * @param id - Toast id returned by showLoading
 * @param type - Target state
 * @param message - Success message or error (ApiError/Error/unknown) for error
 * @returns new toast id
 */
export function updateToast(
  id: string | number,
  type: "success" | "error",
  message: unknown,
): string | number {
  toast.dismiss(id);

  if (type === "success") {
    const successMessage =
      typeof message === "string" ? message : getFriendlyMessage(message);
    return showSuccess(successMessage);
  }

  return showError(message);
}
