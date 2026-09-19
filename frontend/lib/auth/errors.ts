// Auth errors — API error mapping for auth forms

import { ApiError } from "@/api/client";

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocorreu um erro inesperado. Verifique sua conexão e tente novamente — se persistir, contate o suporte.";
}

// Message keywords mapping backend field names to form fields.
// The message is lowercased before matching; keep both compact and
// snake_case spellings where the backend varies.
const FIELD_MATCHERS: ReadonlyArray<{ field: string; keywords: string[] }> = [
  { field: "complete_name", keywords: ["complete_name"] },
  { field: "password", keywords: ["password", "weak password"] },
  { field: "email", keywords: ["email"] },
  { field: "phone", keywords: ["phone"] },
  { field: "postal_code", keywords: ["postal_code"] },
  { field: "bio", keywords: ["bio"] },
  { field: "hourlyRate", keywords: ["hourly", "hourlyrate"] },
  { field: "skills", keywords: ["skills"] },
  { field: "portfolio", keywords: ["portfolio"] },
  { field: "title", keywords: ["title"] },
  { field: "description", keywords: ["description"] },
  { field: "categoryId", keywords: ["categoryid", "category_id"] },
  { field: "budgetMin", keywords: ["budgetmin", "budget_min"] },
  { field: "budgetMax", keywords: ["budgetmax", "budget_max"] },
  {
    field: "isAvailable",
    keywords: ["isavailable", "is_available", "available"],
  },
];

function matchBadRequestFields(
  msg: string,
  message: string,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const { field, keywords } of FIELD_MATCHERS) {
    if (keywords.some((keyword) => msg.includes(keyword))) {
      fieldErrors[field] = message;
    }
  }
  return fieldErrors;
}

export function mapApiErrorToFieldErrors(
  error: unknown,
): Record<string, string> | null {
  if (!(error instanceof ApiError)) return null;

  if (error.status === 409) {
    return { email: error.message };
  }

  const msg = error.message.toLowerCase();

  if (error.status === 403 && msg.includes("verify your email")) {
    return null;
  }

  if (error.status === 400) {
    const fieldErrors = matchBadRequestFields(msg, error.message);
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
