import { mockGetPaymentByProposalId } from "@/mock/worker/payments";
import type { WorkerPaymentStatusResponse } from "@/lib/worker/payments/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * Não há endpoint PROVIDER em API.md para pagamentos.
 * Em modo mock devolve o status seedado; fora do mock falha de forma explícita.
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
