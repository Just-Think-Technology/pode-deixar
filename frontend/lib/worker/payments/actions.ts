// Worker payment actions — receipt server actions

"use server";

import {
  getPaymentStatusByProposal,
  listWorkerPayments,
} from "@/api/worker/payments";
import { getAccessToken } from "@/lib/auth/session.server";
import type { WorkerPaymentStatusResponse } from "@/lib/worker/payments/types";

export async function getWorkerPaymentStatusByProposalAction(
  proposalId: string,
): Promise<WorkerPaymentStatusResponse> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return getPaymentStatusByProposal(token, proposalId);
}

export async function listWorkerPaymentsAction(): Promise<
  WorkerPaymentStatusResponse[]
> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return listWorkerPayments(token);
}