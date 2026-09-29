// Worker payment actions — receipt server actions

"use server";

import {
  getPaymentStatusByProposal,
  listWorkerPayments,
} from "@/api/worker/payments";
import { getAccessToken } from "@/lib/auth/session.server";
import { FRIENDLY_MESSAGES } from "@/lib/errors/messages";
import type { WorkerPaymentStatusResponse } from "@/lib/worker/payments/types";
import {
  mockGetPaymentByProposalId,
  mockListWorkerPayments,
} from "@/mock/worker/payments";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getWorkerPaymentStatusByProposalAction(
  proposalId: string,
): Promise<WorkerPaymentStatusResponse> {
  if (USE_MOCK) {
    return mockGetPaymentByProposalId(proposalId);
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error(FRIENDLY_MESSAGES.unauthenticated);
  }

  return getPaymentStatusByProposal(token, proposalId);
}

export async function listWorkerPaymentsAction(): Promise<
  WorkerPaymentStatusResponse[]
> {
  if (USE_MOCK) {
    return mockListWorkerPayments();
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error(FRIENDLY_MESSAGES.unauthenticated);
  }

  return listWorkerPayments(token);
}
