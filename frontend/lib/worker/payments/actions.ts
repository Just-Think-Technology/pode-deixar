"use server";

import { getPaymentStatusByProposal } from "@/api/worker/payments";
import { getAccessToken } from "@/lib/auth/session.server";
import type { WorkerPaymentStatusResponse } from "@/lib/worker/payments/types";
import { mockGetPaymentByProposalId } from "@/mock/worker/payments";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getWorkerPaymentStatusByProposalAction(
  proposalId: string,
): Promise<WorkerPaymentStatusResponse> {
  if (USE_MOCK) {
    return mockGetPaymentByProposalId(proposalId);
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return getPaymentStatusByProposal(token, proposalId);
}
