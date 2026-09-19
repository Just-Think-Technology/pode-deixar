// Toast wrapper spec — success/error/warning/info/loading and updateToast

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/api/client";

const toastMocks = {
  success: vi.fn(() => "toast-success-id"),
  error: vi.fn(() => "toast-error-id"),
  warning: vi.fn(() => "toast-warning-id"),
  info: vi.fn(() => "toast-info-id"),
  loading: vi.fn(() => "toast-loading-id"),
  dismiss: vi.fn(),
};

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) =>
      (toastMocks.success as unknown as (...a: unknown[]) => unknown)(...args),
    error: (...args: unknown[]) =>
      (toastMocks.error as unknown as (...a: unknown[]) => unknown)(...args),
    warning: (...args: unknown[]) =>
      (toastMocks.warning as unknown as (...a: unknown[]) => unknown)(...args),
    info: (...args: unknown[]) =>
      (toastMocks.info as unknown as (...a: unknown[]) => unknown)(...args),
    loading: (...args: unknown[]) =>
      (toastMocks.loading as unknown as (...a: unknown[]) => unknown)(...args),
    dismiss: (...args: unknown[]) =>
      (toastMocks.dismiss as unknown as (...a: unknown[]) => unknown)(...args),
  },
}));

// Import after mock
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  updateToast,
} from "@/lib/toast";

describe("lib/toast wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows success with 3000ms duration", () => {
    showSuccess("Alterações salvas com sucesso.");

    expect(toastMocks.success).toHaveBeenCalledWith(
      "Alterações salvas com sucesso.",
      expect.objectContaining({ duration: 3000 }),
    );
  });

  it("shows error with 5000ms duration", () => {
    showError(new Error("Falha ao salvar"));

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Falha ao salvar",
      expect.objectContaining({ duration: 5000 }),
    );
  });

  it("maps ApiError via getApiErrorMessage", () => {
    const err = new ApiError("Sessão expirada. Faça login novamente.", 401);

    showError(err);

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Sessão expirada. Faça login novamente.",
      expect.any(Object),
    );
  });

  it("maps Prisma code P2002 to friendly message without leaking code", () => {
    const err = new ApiError("P2002", 500);

    showError(err);

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Não foi possível completar. Tente novamente.",
      expect.objectContaining({ duration: 5000 }),
    );
  });

  it("blocks stack trace — strips newline stack content", () => {
    const err = new Error("Erro interno\n    at Object.test (app.js:10:5)\n    at stack");

    showError(err);

    const calledMessage = (toastMocks.error.mock.calls[0] as unknown[] | undefined)?.[0] as string;
    expect(calledMessage).toBe("Erro interno");
    expect(calledMessage).not.toContain("at Object");
    expect(calledMessage).not.toContain("stack");
  });

  it("blocks stack trace — does not expose ApiError stack", () => {
    const err = new ApiError("Erro com stack\nstack: at something", 500);
    // ApiError has stack property but getApiErrorMessage should not leak it
    showError(err);

    const calledMessage = (toastMocks.error.mock.calls[0] as unknown[] | undefined)?.[0] as string;
    expect(calledMessage).toBe("Erro com stack");
    expect(calledMessage).not.toContain("\n");
    expect(toastMocks.error).toHaveBeenCalledWith(
      expect.not.stringContaining("at something"),
      expect.any(Object),
    );
  });

  it("shows warning and info", () => {
    showWarning("Atenção: limite próximo");
    showInfo("Informação geral");

    expect(toastMocks.warning).toHaveBeenCalledWith(
      "Atenção: limite próximo",
      expect.any(Object),
    );
    expect(toastMocks.info).toHaveBeenCalledWith(
      "Informação geral",
      expect.any(Object),
    );
  });

  it("shows loading with indefinite duration", () => {
    const id = showLoading("Salvando…");

    expect(toastMocks.loading).toHaveBeenCalledWith(
      "Salvando…",
      expect.objectContaining({ duration: Infinity }),
    );
    expect(id).toBe("toast-loading-id");
  });

  it("updateToast loading→success dismisses and shows success", () => {
    const id = showLoading("Salvando…");
    expect(toastMocks.loading).toHaveBeenCalledWith(
      "Salvando…",
      expect.any(Object),
    );

    vi.clearAllMocks();

    updateToast(id, "success", "Alterações salvas com sucesso.");

    expect(toastMocks.dismiss).toHaveBeenCalledWith(id);
    expect(toastMocks.success).toHaveBeenCalledWith(
      "Alterações salvas com sucesso.",
      expect.objectContaining({ duration: 3000 }),
    );
  });

  it("updateToast loading→error maps ApiError and dismisses", () => {
    const id = "loading-123";
    const err = new ApiError("Erro ao salvar", 400);

    updateToast(id, "error", err);

    expect(toastMocks.dismiss).toHaveBeenCalledWith(id);
    expect(toastMocks.error).toHaveBeenCalledWith(
      "Erro ao salvar",
      expect.objectContaining({ duration: 5000 }),
    );
  });

  it("showError handles unknown with generic fallback", () => {
    showError(null);
    expect(toastMocks.error).toHaveBeenCalledWith(
      "Ocorreu um erro inesperado. Tente novamente.",
      expect.any(Object),
    );
  });

  it("showError handles plain string directly", () => {
    showError("Mensagem direta");
    expect(toastMocks.error).toHaveBeenCalledWith(
      "Mensagem direta",
      expect.any(Object),
    );
  });
});
