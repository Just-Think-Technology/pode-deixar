import { beforeEach, describe, expect, it } from "vitest";

import {
  getMockCompletionHistory,
  getMockCompletionHistoryWithFallback,
  getMockCompletionOrder,
  getMockPendingPhotos,
  mockCompleteOrder,
  mockRemoveCompletionPhoto,
  mockUploadCompletionPhoto,
  resetMockCompletion,
  setMockCompletionFailure,
} from "@/mock/worker/completion";

const IN_PROGRESS_ORDER = "mock-order-agenda-001";
const COMPLETED_ORDER = "mock-order-agenda-006";
const UNKNOWN_ORDER = "mock-order-inexistente";

describe("mock/worker/completion", () => {
  beforeEach(() => {
    resetMockCompletion();
  });

  describe("getMockCompletionOrder", () => {
    it("retorna o resumo de um pedido em andamento", () => {
      const order = getMockCompletionOrder(IN_PROGRESS_ORDER);
      expect(order).toMatchObject({
        order_id: IN_PROGRESS_ORDER,
        order_status: "IN_PROGRESS",
        client_name: "Maria Silva",
      });
      expect(order?.amount).toBeGreaterThan(0);
    });

    it("retorna null para pedido desconhecido", () => {
      expect(getMockCompletionOrder(UNKNOWN_ORDER)).toBeNull();
    });
  });

  describe("upload e remoção", () => {
    it("acumula fotos pendentes", () => {
      mockUploadCompletionPhoto(IN_PROGRESS_ORDER, "blob:foto-1");
      mockUploadCompletionPhoto(IN_PROGRESS_ORDER, "blob:foto-2");
      expect(getMockPendingPhotos(IN_PROGRESS_ORDER)).toHaveLength(2);
    });

    it("impõe o máximo de 10 fotos", () => {
      for (let i = 0; i < 10; i++) {
        mockUploadCompletionPhoto(IN_PROGRESS_ORDER, `blob:foto-${i}`);
      }
      expect(() =>
        mockUploadCompletionPhoto(IN_PROGRESS_ORDER, "blob:foto-11"),
      ).toThrow("O serviço pode ter no máximo 10 fotos.");
    });

    it("remove foto antes da confirmação", () => {
      const photo = mockUploadCompletionPhoto(IN_PROGRESS_ORDER, "blob:foto-1");
      mockRemoveCompletionPhoto(IN_PROGRESS_ORDER, photo.id);
      expect(getMockPendingPhotos(IN_PROGRESS_ORDER)).toHaveLength(0);
    });

    it("rejeita upload em pedido desconhecido", () => {
      expect(() =>
        mockUploadCompletionPhoto(UNKNOWN_ORDER, "blob:foto-1"),
      ).toThrow("Serviço não encontrado.");
    });
  });

  describe("mockCompleteOrder", () => {
    it("exige pelo menos uma foto", () => {
      expect(() => mockCompleteOrder(IN_PROGRESS_ORDER, null)).toThrow(
        "Adicione pelo menos uma foto para concluir o serviço.",
      );
    });

    it("conclui com foto e observações opcionais", () => {
      mockUploadCompletionPhoto(IN_PROGRESS_ORDER, "blob:foto-1");
      const history = mockCompleteOrder(IN_PROGRESS_ORDER, "Troca sem vazamento");
      expect(history).toMatchObject({
        order_id: IN_PROGRESS_ORDER,
        completed_by: "Você",
        observations: "Troca sem vazamento",
      });
      expect(history.photos).toHaveLength(1);
      expect(history.completed_at).toBeTruthy();
    });

    it("muda o status para COMPLETED e impede nova conclusão", () => {
      mockUploadCompletionPhoto(IN_PROGRESS_ORDER, "blob:foto-1");
      mockCompleteOrder(IN_PROGRESS_ORDER, null);
      expect(getMockCompletionOrder(IN_PROGRESS_ORDER)?.order_status).toBe(
        "COMPLETED",
      );
      expect(() => mockCompleteOrder(IN_PROGRESS_ORDER, null)).toThrow(
        "Este serviço já foi concluído.",
      );
    });

    it("falha sem alterar o status quando o pedido está sinalizado", () => {
      mockUploadCompletionPhoto(IN_PROGRESS_ORDER, "blob:foto-1");
      setMockCompletionFailure(IN_PROGRESS_ORDER, true);
      expect(() => mockCompleteOrder(IN_PROGRESS_ORDER, null)).toThrow(
        "Não foi possível concluir o serviço",
      );
      expect(getMockCompletionOrder(IN_PROGRESS_ORDER)?.order_status).toBe(
        "IN_PROGRESS",
      );
      expect(getMockPendingPhotos(IN_PROGRESS_ORDER)).toHaveLength(1);
    });
  });

  describe("histórico", () => {
    it("retorna o registro da conclusão em sessão", () => {
      mockUploadCompletionPhoto(IN_PROGRESS_ORDER, "blob:foto-1");
      mockCompleteOrder(IN_PROGRESS_ORDER, "Obs");
      const history = getMockCompletionHistory(IN_PROGRESS_ORDER);
      expect(history?.photos).toHaveLength(1);
      expect(history?.observations).toBe("Obs");
    });

    it("usa fallback para pedido COMPLETED da agenda sem registro", () => {
      expect(getMockCompletionHistory(COMPLETED_ORDER)).toBeNull();
      const history = getMockCompletionHistoryWithFallback(COMPLETED_ORDER);
      expect(history?.order_id).toBe(COMPLETED_ORDER);
      expect(history?.completed_at).toBeTruthy();
      expect(history?.photos.length).toBeGreaterThan(0);
    });

    it("retorna null para pedido em andamento sem conclusão", () => {
      expect(
        getMockCompletionHistoryWithFallback(IN_PROGRESS_ORDER),
      ).toBeNull();
    });
  });
});
