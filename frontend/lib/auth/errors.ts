import { ApiError } from "@/api/client";

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}

export function mapApiErrorToFieldErrors(
  error: unknown,
): Record<string, string> | null {
  if (!(error instanceof ApiError)) return null;

  const fieldErrors: Record<string, string> = {};

  if (error.status === 409) {
    fieldErrors.email = error.message;
    return fieldErrors;
  }

  const msg = error.message.toLowerCase();

  if (error.status === 403 && msg.includes("verify your email")) {
    return null;
  }

  if (error.status === 400) {
    if (msg.includes("complete_name")) {
      fieldErrors.complete_name = error.message;
    }
    if (msg.includes("password") || msg.includes("weak password")) {
      fieldErrors.password = error.message;
    }
    if (msg.includes("email")) {
      fieldErrors.email = error.message;
    }
    if (msg.includes("phone")) {
      fieldErrors.phone = error.message;
    }
    if (msg.includes("postal_code")) {
      fieldErrors.postal_code = error.message;
    }
    if (Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }
  }

  return null;
}

export function isEmailNotVerifiedError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 403) return false;
  return error.message.toLowerCase().includes("verify your email");
}
