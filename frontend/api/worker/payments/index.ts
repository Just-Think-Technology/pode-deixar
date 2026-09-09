import {
  mockGetPaymentByProposalId,
  mockListWorkerPayments,
} from "@/mock/worker/payments";
import type { WorkerPaymentStatusResponse } from "@/lib/worker/payments/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * No PROVIDER endpoint in API.md for payments.
 * In mock mode returns the seeded status; outside mock it fails explicitly.
 * Future contract: GET /payments/by-proposal/:proposalId (role PROVIDER).
 */
export function getPaymentStatusByProposal(
  _accessToken: string,
  proposalId: string,
): Promise<WorkerPaymentStatusResponse> {
  if (USE_MOCK) {
    return Promise.resolve(mockGetPaymentByProposalId(proposalId));
  }

  return Promise.reject(
    new Error(
      "Consulta de pagamento pelo prestador ainda não está disponível na API. Use NEXT_PUBLIC_USE_MOCK=true.",
    ),
  );
}

/**
 * Lists receipts of the authenticated provider.
 * Contrato futuro: GET /payments/provider/me (role PROVIDER).
 */
export function listWorkerPayments(
  _accessToken: string,
): Promise<WorkerPaymentStatusResponse[]> {
  if (USE_MOCK) {
    return Promise.resolve(mockListWorkerPayments());
  }

  return Promise.reject(
    new Error(
      "Listagem de recebimentos pelo prestador ainda não está disponível na API. Use NEXT_PUBLIC_USE_MOCK=true.",
    ),
  );
}
