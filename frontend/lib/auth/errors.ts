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
    if (msg.includes("bio")) {
      fieldErrors.bio = error.message;
    }
    if (msg.includes("hourly") || msg.includes("hourlyrate")) {
      fieldErrors.hourlyRate = error.message;
    }
    if (msg.includes("skills")) {
      fieldErrors.skills = error.message;
    }
    if (msg.includes("portfolio")) {
      fieldErrors.portfolio = error.message;
    }
    if (msg.includes("title")) {
      fieldErrors.title = error.message;
    }
    if (msg.includes("description")) {
      fieldErrors.description = error.message;
    }
    if (msg.includes("categoryid") || msg.includes("category_id")) {
      fieldErrors.categoryId = error.message;
    }
    if (msg.includes("budgetmin") || msg.includes("budget_min")) {
      fieldErrors.budgetMin = error.message;
    }
    if (msg.includes("budgetmax") || msg.includes("budget_max")) {
      fieldErrors.budgetMax = error.message;
    }
    if (msg.includes("isavailable") || msg.includes("is_available") || msg.includes("available")) {
      fieldErrors.isAvailable = error.message;
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
