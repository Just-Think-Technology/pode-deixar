import { describe, expect, it } from "vitest";

import {
  MAX_COMPLETION_PHOTOS,
  validateCompleteOrder,
  validateCompletionObservations,
  validateCompletionPhoto,
  validateCompletionPhotoCount,
} from "@/lib/worker/orders/validation";

function imageFile(size: number, type = "image/jpeg"): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], "foto.jpg", { type });
}

describe("validateCompletionPhoto", () => {
  it("aceita JPEG dentro do limite", () => {
    expect(validateCompletionPhoto(imageFile(1024))).toEqual({ ok: true });
  });

  it("rejeita arquivo acima de 5MB", () => {
    const result = validateCompletionPhoto(imageFile(5 * 1024 * 1024 + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.photo).toBe("A imagem deve ter no máximo 5MB");
    }
  });

  it("rejeita tipo não permitido", () => {
    const result = validateCompletionPhoto(imageFile(1024, "image/bmp"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.photo).toContain("Formato inválido");
    }
  });
});

describe("validateCompletionPhotoCount", () => {
  it("rejeita zero fotos", () => {
    const result = validateCompletionPhotoCount(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.photos).toBe(
        "Adicione pelo menos uma foto para concluir o serviço.",
      );
    }
  });

  it("aceita de 1 até o máximo", () => {
    expect(validateCompletionPhotoCount(1)).toEqual({ ok: true });
    expect(validateCompletionPhotoCount(MAX_COMPLETION_PHOTOS)).toEqual({
      ok: true,
    });
  });

  it("rejeita acima do máximo", () => {
    const result = validateCompletionPhotoCount(MAX_COMPLETION_PHOTOS + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.photos).toBe(
        "O serviço pode ter no máximo 10 fotos.",
      );
    }
  });
});

describe("validateCompletionObservations", () => {
  it("aceita vazio (opcional)", () => {
    expect(validateCompletionObservations("")).toEqual({ ok: true });
    expect(validateCompletionObservations("   ")).toEqual({ ok: true });
  });

  it("aceita até 2000 caracteres", () => {
    expect(validateCompletionObservations("a".repeat(2000))).toEqual({
      ok: true,
    });
  });

  it("rejeita acima de 2000 caracteres", () => {
    const result = validateCompletionObservations("a".repeat(2001));
    expect(result.ok).toBe(false);
  });
});

describe("validateCompleteOrder", () => {
  it("exige pelo menos uma foto mesmo com observações válidas", () => {
    const result = validateCompleteOrder(0, "Tudo certo");
    expect(result.ok).toBe(false);
  });

  it("aprova com foto e observações opcionais vazias", () => {
    expect(validateCompleteOrder(1, "")).toEqual({ ok: true });
  });

  it("acumula erros de fotos e observações", () => {
    const result = validateCompleteOrder(0, "a".repeat(2001));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "observations",
        "photos",
      ]);
    }
  });
});
