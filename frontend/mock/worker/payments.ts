import { getMockProposalById } from "@/mock/worker/proposals";
import type { WorkerPaymentStatusResponse } from "@/lib/worker/payments/types";

/**
 * Seeds de recebimentos do prestador (JTT-95 + JTT-93).
 * Inclui vários status para a listagem do painel.
 */
const SEEDED_PAYMENTS: WorkerPaymentStatusResponse[] = [
  {
    paymentId: "mock-worker-payment-002",
    serviceOrderId: "mock-order-002",
    proposalId: "mock-proposal-002",
    status: "PAID",
    method: "PIX",
    amount: 350,
    currency: "BRL",
    externalRef: "chg_mock_worker_002",
    paidAt: "2026-06-29T12:00:00.000Z",
    createdAt: "2026-06-29T11:30:00.000Z",
  },
  {
    paymentId: "mock-worker-payment-006",
    serviceOrderId: "mock-order-006",
    proposalId: "mock-proposal-006",
    status: "PENDING",
    method: "PIX",
    amount: 220,
    currency: "BRL",
    externalRef: "chg_mock_worker_006",
    paidAt: null,
    createdAt: "2026-07-10T09:00:00.000Z",
  },
  {
    paymentId: "mock-worker-payment-007",
    serviceOrderId: "mock-order-007",
    proposalId: "mock-proposal-007",
    status: "FAILED",
    method: "CREDIT_CARD",
    amount: 480,
    currency: "BRL",
    externalRef: "chg_mock_worker_007",
    paidAt: null,
    createdAt: "2026-07-05T15:20:00.000Z",
  },
  {
    paymentId: "mock-worker-payment-008",
    serviceOrderId: "mock-order-008",
    proposalId: "mock-proposal-008",
    status: "REFUNDED",
    method: "PIX",
    amount: 150,
    currency: "BRL",
    externalRef: "chg_mock_worker_008",
    paidAt: "2026-06-18T10:00:00.000Z",
    createdAt: "2026-06-17T14:00:00.000Z",
  },
  {
    paymentId: "mock-worker-payment-009",
    serviceOrderId: "mock-order-009",
    proposalId: "mock-proposal-009",
    status: "CANCELLED",
    method: "PIX",
    amount: 90,
    currency: "BRL",
    externalRef: null,
    paidAt: null,
    createdAt: "2026-06-12T11:00:00.000Z",
  },
];

type MockWorkerPaymentsGlobal = typeof globalThis & {
  __podeDeixarMockWorkerPayments?: Map<string, WorkerPaymentStatusResponse>;
};

function getStore(): Map<string, WorkerPaymentStatusResponse> {
  const g = globalThis as MockWorkerPaymentsGlobal;
  if (!g.__podeDeixarMockWorkerPayments) {
    g.__podeDeixarMockWorkerPayments = new Map(
      SEEDED_PAYMENTS.map((payment) => [payment.proposalId, payment]),
    );
  }
  return g.__podeDeixarMockWorkerPayments;
}

export function resetMockWorkerPayments() {
  const g = globalThis as MockWorkerPaymentsGlobal;
  g.__podeDeixarMockWorkerPayments = new Map(
    SEEDED_PAYMENTS.map((payment) => [payment.proposalId, payment]),
  );
}

export function mockGetPaymentByProposalId(
  proposalId: string,
): WorkerPaymentStatusResponse {
  const proposal = getMockProposalById(proposalId);
  if (!proposal) {
    throw new Error("Proposta não encontrada");
  }

  const payment = getStore().get(proposalId);
  if (!payment) {
    throw new Error(
      "Pagamento não encontrado para esta proposta. O cliente ainda não iniciou o pagamento.",
    );
  }

  return { ...payment };
}

export function mockListWorkerPayments(): WorkerPaymentStatusResponse[] {
  return Array.from(getStore().values())
    .map((payment) => ({ ...payment }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}
