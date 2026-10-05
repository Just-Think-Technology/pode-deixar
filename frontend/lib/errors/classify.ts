// Backend error extraction — reads every response shape the API may send

export type BackendErrorBody = {
  message?: string | string[] | null;
  errors?: string[] | null;
  error?: string | null;
} | null;

/**
 * Collects every candidate message from a backend error body. The shared
 * exception filter sends `message` plus `errors[]`; the auth filter
 * sends `message` plus `error`.
 *
 * @param body - Parsed error body (ApiError.body or raw JSON)
 * @returns Candidate messages in priority order
 */
export function extractBackendMessages(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  const collected: string[] = [];

  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) collected.push(value);
  };

  const message = record.message;
  if (Array.isArray(message)) message.forEach(push);
  else push(message);

  const errors = record.errors;
  if (Array.isArray(errors)) errors.forEach(push);

  push(record.error);

  return collected;
}

/**
 * Reads the HTTP status from an unknown error without importing the
 * ApiError class (keeps this module cycle-free for api/client/http).
 *
 * @param error - Unknown thrown value
 * @returns Status code or null
 */
export function extractStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as Record<string, unknown>).status;
  return typeof status === "number" ? status : null;
}

/**
 * Reads the raw message carried by an unknown error.
 *
 * @param error - Unknown thrown value
 * @returns Raw message or null
 */
export function extractRawMessage(error: unknown): string | null {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return null;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : null;
}
