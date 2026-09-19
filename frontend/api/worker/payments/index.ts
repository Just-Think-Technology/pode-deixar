// Worker payments API — receipt lookup

import type { WorkerPaymentStatusResponse } from "@/lib/worker/payments/types";

/**
 * No PROVIDER endpoint in API.md for payments.
 * Future contract: GET /payments/by-proposal/:proposalId (role PROVIDER).
 */
export function getPaymentStatusByProposal(
  _accessToken: string,
  proposalId: string,
): Promise<WorkerPaymentStatusResponse> {
  return Promise.reject(
    new Error(
      "Consulta de pagamento pelo prestador ainda não está disponível na API.",
    ),
  );
}

/**
 * Lists receipts of the authenticated provider.
 * Future contract: GET /payments/provider/me (role PROVIDER).
 */
export function listWorkerPayments(
  _accessToken: string,
): Promise<WorkerPaymentStatusResponse[]> {
  return Promise.reject(
    new Error(
      "Listagem de recebimentos pelo prestador ainda não está disponível na API.",
    ),
  );
}