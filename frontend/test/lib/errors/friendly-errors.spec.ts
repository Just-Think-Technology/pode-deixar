// Friendly errors spec — centralized API error interpretation

import { describe, it, expect, beforeEach } from "vitest";
import { ApiError } from "@/api/client/http";
import {
  getFriendlyMessage,
  toFriendlyError,
  shouldOfferRetry,
} from "@/lib/errors";
import {
  mapApiErrorToFieldErrors,
  isEmailNotVerifiedError,
} from "@/lib/errors/field-errors";
import {
  shouldNotifySessionExpired,
  resetSessionNoticeGuard,
} from "@/lib/errors/session";
import { extractBackendMessages } from "@/lib/errors/classify";

describe("lib/errors", () => {
  beforeEach(() => {
    resetSessionNoticeGuard();
  });

  it("maps validation errors to a friendly message", () => {
    const err = new ApiError("Validation failed", 400, {
      message: "Validation failed",
    });

    expect(getFriendlyMessage(err)).toBe(
      "Verifique os dados informados e tente novamente.",
    );
    expect(toFriendlyError(err).category).toBe("validation");
  });

  it("never exposes technical backend messages (UUID example)", () => {
    const err = new ApiError("Validation failed: providerId must be a UUID", 400, {
      message: "Validation failed: providerId must be a UUID",
    });

    const message = getFriendlyMessage(err);

    expect(message).toBe("Verifique os dados informados e tente novamente.");
    expect(message).not.toContain("UUID");
    expect(message).not.toContain("providerId");
  });

  it("reads the errors[] array from the shared exception filter", () => {
    const body = {
      message: "Bad Request",
      errors: ["Email deve ser um email válido"],
    };

    expect(extractBackendMessages(body)).toContain(
      "Email deve ser um email válido",
    );
    expect(getFriendlyMessage(new ApiError("Bad Request", 400, body))).toBe(
      "Email deve ser um email válido",
    );
  });

  it("reads the error field from the auth exception filter", () => {
    const body = { message: "Não autorizado", error: "Não Autorizado" };

    expect(extractBackendMessages(body)).toContain("Não autorizado");
  });

  it("maps session expiry with a specific message", () => {
    const err = new ApiError("anything", 401, {});

    expect(getFriendlyMessage(err)).toBe(
      "Sua sessão expirou. Entre novamente para continuar.",
    );
    expect(toFriendlyError(err).category).toBe("unauthenticated");
  });

  it("maps forbidden without leaking roles", () => {
    const err = new ApiError("Forbidden: missing ADMIN role", 403, {
      message: "Forbidden: missing ADMIN role",
    });

    expect(getFriendlyMessage(err)).toBe(
      "Você não tem permissão para realizar esta ação.",
    );
  });

  it("maps not-found with a friendly message", () => {
    expect(getFriendlyMessage(new ApiError("x", 404, {}))).toBe(
      "Não encontramos o que você está procurando.",
    );
  });

  it("prefers safe backend business messages for conflicts", () => {
    const err = new ApiError("Este serviço já foi finalizado.", 409, {
      message: "Este serviço já foi finalizado.",
    });

    expect(getFriendlyMessage(err)).toBe("Este serviço já foi finalizado.");
  });

  it("maps connection and unexpected errors", () => {
    expect(getFriendlyMessage(new ApiError("down", 503, {}))).toBe(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    );
    expect(getFriendlyMessage(new ApiError("boom", 500, {}))).toBe(
      "Ocorreu um erro inesperado. Tente novamente.",
    );
    expect(getFriendlyMessage(null)).toBe(
      "Ocorreu um erro inesperado. Tente novamente.",
    );
  });

  it("builds action-scoped messages for toasts", () => {
    const err = new ApiError("boom", 500, {});

    expect(getFriendlyMessage(err, { action: "enviar a proposta" })).toBe(
      "Não foi possível enviar a proposta. Tente novamente.",
    );
  });

  it("strips stack traces and Prisma codes", () => {
    const stacked = new ApiError("Erro interno\n    at Object (app.js:1:1)", 500, {});
    expect(getFriendlyMessage(stacked)).not.toContain("at Object");

    const prisma = new ApiError("P2002", 500, { message: "P2002" });
    expect(getFriendlyMessage(prisma)).toBe(
      "Ocorreu um erro inesperado. Tente novamente.",
    );
  });

  it("offers retry only for temporary failures", () => {
    expect(shouldOfferRetry(new ApiError("down", 503, {}))).toBe(true);
    expect(shouldOfferRetry(new ApiError("busy", 429, {}))).toBe(true);
    expect(shouldOfferRetry(new ApiError("bad", 400, {}))).toBe(false);
    expect(shouldOfferRetry(new ApiError("conflict", 409, {}))).toBe(false);
    expect(shouldOfferRetry(new ApiError("nope", 404, {}))).toBe(false);
  });

  it("maps field errors for 400 with field keywords", () => {
    const err = new ApiError("Email deve ser um email válido", 400, {});

    expect(mapApiErrorToFieldErrors(err)).toEqual({
      email: "Email deve ser um email válido",
    });
  });

  it("sanitizes technical messages mapped to fields", () => {
    const err = new ApiError("providerId must be valid", 400, {});

    expect(mapApiErrorToFieldErrors(err)).toEqual({
      providerId: "Verifique os dados informados e tente novamente.",
    });
  });

  it("detects unverified email gate", () => {
    const err = new ApiError("Please verify your email", 403, {});

    expect(isEmailNotVerifiedError(err)).toBe(true);
    expect(mapApiErrorToFieldErrors(err)).toBeNull();
  });

  it("guards session expiry to a single notice", () => {
    expect(shouldNotifySessionExpired(1000)).toBe(true);
    expect(shouldNotifySessionExpired(1001)).toBe(false);
    expect(shouldNotifySessionExpired(1000 + 31_000)).toBe(true);
  });
});
