import { getMockProposalById } from "@/mock/worker/proposals";
import type { WorkerPaymentStatusResponse } from "@/lib/worker/payments/types";

/**
 * Seed: pagamento PAID da proposta aceita mock-proposal-002
 * (service_order_id: mock-order-002, preço 350).
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
