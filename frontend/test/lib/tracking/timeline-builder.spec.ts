import { describe, expect, it } from "vitest";

import {
  buildTimelineEvents,
  deriveContractStatus,
  getAvailableActions,
} from "@/lib/tracking/timeline-builder";
import type { ContractTracking } from "@/lib/tracking/types";

function buildTracking(
  overrides: Partial<ContractTracking> = {},
): ContractTracking {
  return {
    orderId: "order-1",
    title: "Reparo elétrico",
    description: "Troca de disjuntor.",
    categoryName: "Elétrica",
    orderStatus: "IN_PROGRESS",
    role: "CLIENT",
    counterpart: { id: "provider-1", completeName: "Carlos Silva", avatarUrl: null },
    scheduledAt: "2026-09-20T14:00:00",
    scheduledEndAt: "2026-09-20T16:00:00",
    startedAt: null,
    address: {
      street: "Rua Augusta",
      number: "500",
      neighborhood: "Consolação",
      city: "São Paulo",
      state: "SP",
      postal_code: "01305-000",
    },
    grossAmount: 180,
    feeAmount: 18,
    netAmount: 162,
    proposal: {
      id: "proposal-1",
      providerId: "provider-1",
      price: 180,
      description: "Posso fazer esta semana.",
      estimatedDuration: "2 horas",
      acceptedAt: "2026-09-10T15:30:00",
    },
    payment: { id: "payment-1", status: "PAID", method: "PIX", amount: 180, paidAt: "2026-09-11T18:00:00" },
    evidence: null,
    review: null,
    cancelReason: null,
    cancelledAt: null,
    createdAt: "2026-09-08T10:00:00",
    ...overrides,
  };
}

describe("lib/tracking/timeline-builder", () => {
  describe("deriveContractStatus", () => {
    it("retorna aguardando pagamento sem confirmação", () => {
      const tracking = buildTracking({
        payment: { id: "p", status: "PENDING", method: "PIX", amount: 180, paidAt: null },
      });
      expect(deriveContractStatus(tracking)).toBe("AWAITING_PAYMENT");
    });

    it("retorna agendado com pagamento confirmado e sem início", () => {
      expect(deriveContractStatus(buildTracking())).toBe("SCHEDULED");
    });

    it("retorna em andamento após o início", () => {
      const tracking = buildTracking({ startedAt: "2026-09-20T14:05:00" });
      expect(deriveContractStatus(tracking)).toBe("IN_PROGRESS");
    });

    it("retorna concluído e cancelado pelos estados finais", () => {
      expect(
        deriveContractStatus(buildTracking({ orderStatus: "COMPLETED" })),
      ).toBe("COMPLETED");
      expect(
        deriveContractStatus(buildTracking({ orderStatus: "CANCELLED" })),
      ).toBe("CANCELLED");
    });
  });

  describe("buildTimelineEvents", () => {
    it("marca eventos ocorridos e destaca o atual", () => {
      const events = buildTimelineEvents(buildTracking());
      const byKey = new Map(events.map((event) => [event.key, event]));

      expect(byKey.get("REQUEST_SENT")?.state).toBe("done");
      expect(byKey.get("PROPOSAL_SENT")?.state).toBe("done");
      expect(byKey.get("PROPOSAL_ACCEPTED")?.state).toBe("done");
      expect(byKey.get("PAYMENT_CONFIRMED")?.state).toBe("done");
      expect(byKey.get("SERVICE_SCHEDULED")?.state).toBe("done");
      expect(byKey.get("SERVICE_STARTED")?.state).toBe("current");
      expect(byKey.get("SERVICE_COMPLETED")?.state).toBe("pending");
      expect(events).toHaveLength(9);
    });

    it("apresenta data, hora e responsável nos eventos concluídos", () => {
      const events = buildTimelineEvents(buildTracking());
      const accepted = events.find((event) => event.key === "PROPOSAL_ACCEPTED");
      expect(accepted?.occurredAt).toBe("2026-09-10T15:30:00");
      expect(accepted?.actorName).toBe("Você");
    });

    it("adapta o responsável conforme o perfil", () => {
      const events = buildTimelineEvents(
        buildTracking({ role: "PROVIDER" }),
      );
      const accepted = events.find((event) => event.key === "PROPOSAL_ACCEPTED");
      expect(accepted?.actorName).toBe("Carlos Silva");
    });

    it("omite proposta na contratação direta e mantém os demais eventos", () => {
      const events = buildTimelineEvents(
        buildTracking({ proposal: null }),
      );
      const keys = events.map((event) => event.key);
      expect(keys).not.toContain("PROPOSAL_SENT");
      expect(keys).not.toContain("PROPOSAL_ACCEPTED");
      expect(keys).toContain("PAYMENT_CONFIRMED");
    });

    it("sinaliza interrupção e omite avaliação no cancelamento", () => {
      const events = buildTimelineEvents(
        buildTracking({ orderStatus: "CANCELLED" }),
      );
      const keys = events.map((event) => event.key);
      expect(keys).not.toContain("REVIEW_SUBMITTED");
      expect(events.some((event) => event.state === "cancelled")).toBe(true);
      expect(events.some((event) => event.state === "current")).toBe(false);
    });

    it("prefere o timestamp autoritativo do backend quando presente", () => {
      const events = buildTimelineEvents(
        buildTracking({
          startedAt: "2026-09-20T14:05:00",
          timeline: [
            {
              key: "SERVICE_STARTED",
              occurredAt: "2026-09-20T14:07:30",
              actorId: "provider-1",
            },
          ],
        }),
      );
      const started = events.find((event) => event.key === "SERVICE_STARTED");
      expect(started?.state).toBe("done");
      expect(started?.occurredAt).toBe("2026-09-20T14:07:30");
    });

    it("marca concluído via timeline do backend mesmo sem flag derivada", () => {
      const events = buildTimelineEvents(
        buildTracking({
          startedAt: null,
          timeline: [
            {
              key: "SERVICE_STARTED",
              occurredAt: "2026-09-20T14:07:30",
              actorId: "provider-1",
            },
          ],
        }),
      );
      const started = events.find((event) => event.key === "SERVICE_STARTED");
      expect(started?.state).toBe("done");
      expect(started?.occurredAt).toBe("2026-09-20T14:07:30");
    });

    it("deriva da flag quando a timeline do backend está ausente", () => {
      const events = buildTimelineEvents(
        buildTracking({ startedAt: "2026-09-20T14:05:00" }),
      );
      const started = events.find((event) => event.key === "SERVICE_STARTED");
      expect(started?.state).toBe("done");
      expect(started?.occurredAt).toBe("2026-09-20T14:05:00");
    });
  });

  describe("getAvailableActions", () => {
    it("libera pagamento só para o cliente aguardando pagamento", () => {
      const pending = buildTracking({
        payment: { id: "p", status: "PENDING", method: "PIX", amount: 180, paidAt: null },
      });
      expect(getAvailableActions(pending).canPay).toBe(true);
      expect(
        getAvailableActions({ ...pending, role: "PROVIDER" }).canPay,
      ).toBe(false);
    });

    it("impede o cliente de iniciar ou finalizar", () => {
      const scheduled = buildTracking();
      expect(getAvailableActions(scheduled).canStart).toBe(false);
      const started = buildTracking({ startedAt: "2026-09-20T14:05:00" });
      expect(getAvailableActions(started).canFinish).toBe(false);
    });

    it("libera início e conclusão só para o prestador no status certo", () => {
      const scheduled = buildTracking({ role: "PROVIDER" });
      expect(getAvailableActions(scheduled).canStart).toBe(true);
      expect(getAvailableActions(scheduled).canFinish).toBe(false);

      const started = buildTracking({
        role: "PROVIDER",
        startedAt: "2026-09-20T14:05:00",
      });
      expect(getAvailableActions(started).canStart).toBe(false);
      expect(getAvailableActions(started).canFinish).toBe(true);
    });

    it("impede o prestador de avaliar e libera avaliação ao cliente", () => {
      const completed = buildTracking({ orderStatus: "COMPLETED" });
      expect(getAvailableActions(completed).canReview).toBe(true);
      expect(
        getAvailableActions({ ...completed, role: "PROVIDER" }).canReview,
      ).toBe(false);
    });

    it("oculta avaliação e evidência fora do contexto", () => {
      const scheduled = buildTracking();
      expect(getAvailableActions(scheduled).canReview).toBe(false);
      expect(getAvailableActions(scheduled).canViewEvidence).toBe(false);
    });
  });
});
