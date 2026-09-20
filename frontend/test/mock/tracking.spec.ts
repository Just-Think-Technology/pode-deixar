import { beforeEach, describe, expect, it } from "vitest";

import {
  deriveContractStatus,
  getAvailableActions,
} from "@/lib/tracking/timeline-builder";
import {
  getMockContractTracking,
  getMockTrackingIds,
  mockFinishService,
  mockStartService,
  mockSubmitReview,
  resetMockTracking,
  TRACKING_ORDER_IDS,
} from "@/mock/tracking";
import { resetMockClientOrders } from "@/mock/client/orders";
import {
  mockChargePayment,
  mockConfirmPayment,
  mockCreatePayment,
  resetMockPayments,
} from "@/mock/client/payments";
import { resetMockCompletion } from "@/mock/worker/completion";

const CLIENT_ORDER_OPEN = "mock-client-order-001";
const CLIENT_ORDER_PROGRESS = "mock-client-order-003";
const AGENDA_PROGRESS = "mock-order-agenda-001";
const AGENDA_COMPLETED = "mock-order-agenda-006";

describe("mock/tracking", () => {
  beforeEach(() => {
    resetMockTracking();
    resetMockClientOrders();
    resetMockPayments();
    resetMockCompletion();
  });

  describe("getMockContractTracking", () => {
    it("cobre os cinco status oficiais", () => {
      expect(getMockTrackingIds()).toHaveLength(5);
      expect(
        deriveContractStatus(
          getMockContractTracking(TRACKING_ORDER_IDS.awaitingPayment, "CLIENT")!,
        ),
      ).toBe("AWAITING_PAYMENT");
      expect(
        deriveContractStatus(
          getMockContractTracking(TRACKING_ORDER_IDS.scheduled, "CLIENT")!,
        ),
      ).toBe("SCHEDULED");
      expect(
        deriveContractStatus(
          getMockContractTracking(TRACKING_ORDER_IDS.inProgress, "CLIENT")!,
        ),
      ).toBe("IN_PROGRESS");
      expect(
        deriveContractStatus(
          getMockContractTracking(TRACKING_ORDER_IDS.completed, "CLIENT")!,
        ),
      ).toBe("COMPLETED");
      expect(
        deriveContractStatus(
          getMockContractTracking(TRACKING_ORDER_IDS.cancelled, "CLIENT")!,
        ),
      ).toBe("CANCELLED");
    });

    it("adapta a contraparte conforme o perfil", () => {
      const asClient = getMockContractTracking(TRACKING_ORDER_IDS.scheduled, "CLIENT")!;
      const asProvider = getMockContractTracking(TRACKING_ORDER_IDS.scheduled, "PROVIDER")!;
      expect(asClient.counterpart.completeName).toBe("Carlos Silva");
      expect(asProvider.counterpart.completeName).toBe("Ana Costa");
    });

    it("retorna null para contratação desconhecida", () => {
      expect(getMockContractTracking("tracking-inexistente", "CLIENT")).toBeNull();
    });

    it("expõe motivo do cancelamento", () => {
      const tracking = getMockContractTracking(TRACKING_ORDER_IDS.cancelled, "CLIENT")!;
      expect(tracking.cancelReason).toBeTruthy();
      expect(tracking.cancelledAt).toBeTruthy();
    });
  });

  describe("mockStartService", () => {
    it("inicia o serviço agendado", () => {
      const tracking = mockStartService(TRACKING_ORDER_IDS.scheduled);
      expect(deriveContractStatus(tracking)).toBe("IN_PROGRESS");
      expect(
        getMockContractTracking(TRACKING_ORDER_IDS.scheduled, "PROVIDER")?.startedAt,
      ).toBeTruthy();
    });

    it("impede início duplicado", () => {
      mockStartService(TRACKING_ORDER_IDS.scheduled);
      expect(() => mockStartService(TRACKING_ORDER_IDS.scheduled)).toThrow(
        "Este serviço já está em andamento.",
      );
    });

    it("impede início sem pagamento confirmado", () => {
      expect(() => mockStartService(TRACKING_ORDER_IDS.awaitingPayment)).toThrow(
        "O serviço só pode começar após a confirmação do pagamento.",
      );
    });

    it("impede início de contratação cancelada", () => {
      expect(() => mockStartService(TRACKING_ORDER_IDS.cancelled)).toThrow(
        "Esta contratação foi cancelada.",
      );
    });
  });

  describe("mockFinishService", () => {
    it("exige pelo menos uma foto", () => {
      expect(() => mockFinishService(TRACKING_ORDER_IDS.inProgress, 0, null)).toThrow(
        "Adicione pelo menos uma foto para concluir o serviço.",
      );
    });

    it("conclui com fotos e observações opcionais", () => {
      const tracking = mockFinishService(TRACKING_ORDER_IDS.inProgress, 2, "Sem vazamento");
      expect(deriveContractStatus(tracking)).toBe("COMPLETED");
      expect(tracking.evidence?.photos.length).toBeGreaterThan(0);
      expect(tracking.evidence?.observations).toBe("Sem vazamento");
    });

    it("impede conclusão duplicada", () => {
      mockFinishService(TRACKING_ORDER_IDS.inProgress, 1, null);
      expect(() => mockFinishService(TRACKING_ORDER_IDS.inProgress, 1, null)).toThrow(
        "Este serviço já foi concluído.",
      );
    });
  });

  describe("mockSubmitReview", () => {    it("exige serviço concluído", () => {
      expect(() =>
        mockSubmitReview(TRACKING_ORDER_IDS.scheduled, { rating: 5 }),
      ).toThrow("A avaliação só é liberada após a conclusão do serviço.");
    });

    it("valida nota e tamanho do comentário", () => {
      expect(() =>
        mockSubmitReview(TRACKING_ORDER_IDS.completed, { rating: 6 }),
      ).toThrow("A nota deve ser um número de 1 a 5.");
      expect(() =>
        mockSubmitReview(TRACKING_ORDER_IDS.completed, {
          rating: 5,
          comment: "x".repeat(501),
        }),
      ).toThrow("O comentário deve ter no máximo 500 caracteres.");
    });

    it("registra a avaliação e impede duplicada", () => {
      const review = mockSubmitReview(TRACKING_ORDER_IDS.completed, {
        rating: 5,
        comment: "Excelente serviço!",
      });
      expect(review.rating).toBe(5);
      expect(
        getMockContractTracking(TRACKING_ORDER_IDS.completed, "CLIENT")?.review,
      ).toMatchObject({ rating: 5 });
      expect(() =>
        mockSubmitReview(TRACKING_ORDER_IDS.completed, { rating: 4 }),
      ).toThrow("Esta contratação já foi avaliada.");
    });
  });

  describe("client orders", () => {
    it("resolve o pedido aberto com propostas pendentes", () => {
      const tracking = getMockContractTracking(CLIENT_ORDER_OPEN, "CLIENT");
      expect(tracking?.title).toBe("Conserto de vazamento no chuveiro");
      expect(deriveContractStatus(tracking!)).toBe("AWAITING_PAYMENT");
      expect(tracking?.proposal?.acceptedAt).toBeNull();
    });

    it("resolve o pedido em andamento com proposta aceita", () => {
      const tracking = getMockContractTracking(CLIENT_ORDER_PROGRESS, "CLIENT");
      expect(tracking?.proposal?.price).toBe(380);
      expect(tracking?.proposal?.acceptedAt).toBeTruthy();
      expect(deriveContractStatus(tracking!)).toBe("AWAITING_PAYMENT");
    });

    it("reflete o pagamento criado e confirmado no checkout", () => {
      const payment = mockCreatePayment({
        serviceOrderId: CLIENT_ORDER_PROGRESS,
        method: "PIX",
        scheduledAt: new Date().toISOString(),
      });
      mockChargePayment(payment.id);
      mockConfirmPayment(payment.id);

      const tracking = getMockContractTracking(CLIENT_ORDER_PROGRESS, "CLIENT");
      expect(tracking?.payment.status).toBe("PAID");
      expect(deriveContractStatus(tracking!)).toBe("SCHEDULED");
    });

    it("permite iniciar após o pagamento", () => {
      const payment = mockCreatePayment({
        serviceOrderId: CLIENT_ORDER_PROGRESS,
        method: "PIX",
        scheduledAt: new Date().toISOString(),
      });
      mockChargePayment(payment.id);
      mockConfirmPayment(payment.id);

      const started = mockStartService(CLIENT_ORDER_PROGRESS);
      expect(deriveContractStatus(started)).toBe("IN_PROGRESS");
    });

    it("resolve o pedido concluído com evidências e avaliação pendente", () => {
      const tracking = getMockContractTracking("mock-client-order-004", "CLIENT")!;
      expect(deriveContractStatus(tracking)).toBe("COMPLETED");
      expect(tracking.payment.status).toBe("PAID");
      expect(tracking.evidence?.photos).toHaveLength(2);
      expect(tracking.review).toBeNull();
      expect(getAvailableActions(tracking).canReview).toBe(true);
    });

    it("avalia o pedido concluído da lista", () => {
      mockSubmitReview("mock-client-order-004", { rating: 5 });
      const tracking = getMockContractTracking("mock-client-order-004", "CLIENT")!;
      expect(tracking.review?.rating).toBe(5);
      expect(getAvailableActions(tracking).canReview).toBe(false);
    });
  });

  describe("agenda events", () => {
    it("resolve o evento agendado com pagamento confirmado", () => {
      const tracking = getMockContractTracking(AGENDA_PROGRESS, "PROVIDER")!;
      expect(tracking.counterpart.completeName).toBe("Maria Silva");
      expect(tracking.payment.status).toBe("PAID");
      expect(deriveContractStatus(tracking)).toBe("SCHEDULED");
    });

    it("inicia e conclui o evento da agenda", () => {
      mockStartService(AGENDA_PROGRESS);
      expect(
        deriveContractStatus(getMockContractTracking(AGENDA_PROGRESS, "PROVIDER")!),
      ).toBe("IN_PROGRESS");

      const finished = mockFinishService(AGENDA_PROGRESS, 1, null);
      expect(deriveContractStatus(finished)).toBe("COMPLETED");
      expect(finished.evidence?.photos.length).toBeGreaterThan(0);
    });

    it("libera avaliação no evento concluído", () => {
      const tracking = getMockContractTracking(AGENDA_COMPLETED, "CLIENT")!;
      expect(deriveContractStatus(tracking)).toBe("COMPLETED");
      expect(tracking.evidence?.photos.length).toBeGreaterThan(0);

      const review = mockSubmitReview(AGENDA_COMPLETED, { rating: 4 });
      expect(review.rating).toBe(4);
    });
  });
});
