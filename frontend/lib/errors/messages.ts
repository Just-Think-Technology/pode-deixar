// Friendly error messages — single home for user-facing API error copy

import type { ErrorCategory } from "@/lib/errors/types";
import { isTechnicalMessage } from "@/lib/errors/sanitize";

// --- Message catalog ---

export const FRIENDLY_MESSAGES: Record<ErrorCategory, string> = {
  validation: "Verifique os dados informados e tente novamente.",
  unauthenticated: "Sua sessão expirou. Entre novamente para continuar.",
  forbidden: "Você não tem permissão para realizar esta ação.",
  "not-found": "Não encontramos o que você está procurando.",
  conflict: "Esta ação não pode ser realizada no momento.",
  "rate-limited": "Muitas tentativas. Aguarde um momento e tente novamente.",
  connection:
    "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  server: "Ocorreu um erro inesperado. Tente novamente.",
  unknown: "Ocorreu um erro inesperado. Tente novamente.",
};

export const GENERIC_FALLBACK = FRIENDLY_MESSAGES.unknown;

/**
 * Maps an HTTP status to its error category.
 *
 * @param status - HTTP status code or null for network failures
 * @returns Error category
 */
export function categoryForStatus(status: number | null): ErrorCategory {
  if (status === null) return "connection";
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate-limited";
  if (status === 503 || status === 502 || status === 504) return "connection";
  if (status >= 500) return "server";
  return "unknown";
}

/**
 * Resolves the user-facing message for a status, preferring safe
 * backend business messages (e.g. order already finished) over the
 * generic catalog entry.
 *
 * @param status - HTTP status code or null
 * @param businessMessage - Raw backend message, if any
 * @returns Friendly PT-BR message
 */
export function messageForStatus(
  status: number | null,
  businessMessage?: string | null,
): string {
  return messageForCandidates(status, businessMessage ? [businessMessage] : []);
}

/**
 * Resolves the user-facing message from several backend candidates
 * (message array, errors[]). Safe candidates are joined; when none
 * is safe the generic catalog entry is used.
 *
 * @param status - HTTP status code or null
 * @param candidates - Raw backend messages in priority order
 * @returns Friendly PT-BR message
 */
export function messageForCandidates(
  status: number | null,
  candidates: string[],
): string {
  const category = categoryForStatus(status);
  const fallback = FRIENDLY_MESSAGES[category];
  if (
    category === "conflict" ||
    category === "not-found" ||
    category === "validation"
  ) {
    const safe = candidates
      .map((candidate) => candidate.split("\n")[0]?.trim() ?? "")
      .filter((candidate) => candidate && !isTechnicalMessage(candidate));
    if (safe.length > 0) return safe.join("; ");
  }
  return fallback;
}
