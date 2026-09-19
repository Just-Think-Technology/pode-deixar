// Toast wrappers — standardized sonner helpers with durations and ApiError mapping

import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/auth/errors";

// --- Constants ---

const SUCCESS_DURATION = 3000;
const ERROR_DURATION = 5000;
const WARNING_DURATION = 4000;
const INFO_DURATION = 4000;

// --- Internal helpers ---

/**
 * Resolves a user-facing message without leaking stack traces or internal codes.
 * Maps Prisma-like codes (e.g. P2002) to a generic PT message and strips
 * newline stack traces, delegating base mapping to getApiErrorMessage.
 */
function resolveMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  const message = getApiErrorMessage(error);

  // Block isolated Prisma error codes from reaching the UI
  if (/^P\d{4}$/.test(message.trim())) {
    return "Não foi possível completar. Tente novamente.";
  }

  // Strip stack trace remnants — keep only first line
  if (message.includes("\n")) {
    const firstLine = message.split("\n")[0]?.trim();
    if (firstLine) return firstLine;
    return "Ocorreu um erro inesperado. Tente novamente.";
  }

  return message;
}

// --- Public API ---

/**
 * Shows a success toast that auto-closes after 3 seconds.
 *
 * @param message - User-facing success message in PT-BR
 * @returns toast id
 */
export function showSuccess(message: string): string | number {
  return toast.success(message, { duration: SUCCESS_DURATION });
}

/**
 * Shows an error toast that auto-closes after 5 seconds.
 * Maps ApiError via getApiErrorMessage and blocks stack traces.
 *
 * @param error - ApiError, Error, string or unknown
 * @returns toast id
 */
export function showError(error: unknown): string | number {
  const message = resolveMessage(error);
  return toast.error(message, { duration: ERROR_DURATION });
}

/**
 * Shows a warning toast.
 *
 * @param message - User-facing warning message in PT-BR
 * @returns toast id
 */
export function showWarning(message: string): string | number {
  return toast.warning(message, { duration: WARNING_DURATION });
}

/**
 * Shows an info toast.
 *
 * @param message - User-facing info message in PT-BR
 * @returns toast id
 */
export function showInfo(message: string): string | number {
  return toast.info(message, { duration: INFO_DURATION });
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
      typeof message === "string" ? message : getApiErrorMessage(message);
    return showSuccess(successMessage);
  }

  return showError(message);
}
