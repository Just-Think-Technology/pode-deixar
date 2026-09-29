// Field error mapping — backend messages to form fields across domains

import { FRIENDLY_MESSAGES } from "@/lib/errors/messages";
import { sanitizeMessage } from "@/lib/errors/sanitize";

// Message keywords mapping backend field names to form fields.
// The message is lowercased before matching; keep both compact and
// snake_case spellings where the backend varies.
const FIELD_MATCHERS: ReadonlyArray<{ field: string; keywords: string[] }> = [
  { field: "complete_name", keywords: ["complete_name", "complete name"] },
  { field: "password", keywords: ["password", "weak password", "senha"] },
  { field: "email", keywords: ["email", "e-mail"] },
  { field: "phone", keywords: ["phone", "telefone"] },
  { field: "postal_code", keywords: ["postal_code", "postal code", "cep"] },
  { field: "bio", keywords: ["bio"] },
  { field: "hourlyRate", keywords: ["hourly", "hourlyrate"] },
  { field: "skills", keywords: ["skills"] },
  { field: "portfolio", keywords: ["portfolio"] },
  { field: "title", keywords: ["title", "título"] },
  { field: "description", keywords: ["description", "descri"] },
  { field: "categoryId", keywords: ["categoryid", "category_id", "categor"] },
  { field: "budgetMin", keywords: ["budgetmin", "budget_min"] },
  { field: "budgetMax", keywords: ["budgetmax", "budget_max"] },
  {
    field: "isAvailable",
    keywords: ["isavailable", "is_available", "available"],
  },
  { field: "providerId", keywords: ["providerid", "provider_id", "provider"] },
  { field: "serviceOrderId", keywords: ["serviceorderid", "service_order"] },
  { field: "proposalId", keywords: ["proposalid", "proposal_id", "proposta"] },
  { field: "rating", keywords: ["rating", "nota", "avalia"] },
  { field: "comment", keywords: ["comment", "coment"] },
  { field: "amount", keywords: ["amount", "valor", "price", "pre"] },
  { field: "date", keywords: ["date", "data", "schedule"] },
];

function matchFields(
  normalized: string,
  message: string,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  // Field messages also go through sanitization so raw backend jargon
  // (e.g. "must be a UUID") never lands under an input.
  const safeMessage = sanitizeMessage(
    message,
    FRIENDLY_MESSAGES.validation,
  );
  for (const { field, keywords } of FIELD_MATCHERS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      fieldErrors[field] = safeMessage;
    }
  }
  return fieldErrors;
}

function readStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as Record<string, unknown>).status;
  return typeof status === "number" ? status : null;
}

function readMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : "";
}

/**
 * Maps an API error to per-field form errors when the failure relates
 * to specific fields. Returns null for global errors (auth, permission,
 * not-found, conflicts) so callers fall back to toast/banner.
 *
 * @param error - Unknown thrown value (ApiError-compatible shape)
 * @returns Field-to-message map or null
 */
export function mapApiErrorToFieldErrors(
  error: unknown,
): Record<string, string> | null {
  const status = readStatus(error);
  if (status === null) return null;

  if (status === 409) {
    const message = readMessage(error);
    const normalized = message.toLowerCase();
    if (normalized.includes("email")) return { email: message };
    return null;
  }

  const message = readMessage(error);
  const normalized = message.toLowerCase();

  if (status === 403 && normalized.includes("verify your email")) return null;

  if (status === 400 || status === 422) {
    const fieldErrors = matchFields(normalized, message);
    if (Object.keys(fieldErrors).length > 0) return fieldErrors;
  }

  return null;
}

/**
 * Detects the unverified-email gate so forms can link to verification.
 *
 * @param error - Unknown thrown value
 * @returns True for the 403 verify-email error
 */
export function isEmailNotVerifiedError(error: unknown): boolean {
  if (readStatus(error) !== 403) return false;
  return readMessage(error).toLowerCase().includes("verify your email");
}
