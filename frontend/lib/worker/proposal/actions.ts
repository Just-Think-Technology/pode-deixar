// Worker proposal actions — proposal list and secure detail with mock fallback

"use server";

import { ApiError } from "@/api/client/http";
import { withServerTokenRefresh } from "@/lib/auth/server-token-refresh";
import { getMyProposals } from "@/api/worker/proposals";
import type { WorkerProposal } from "@/lib/worker/proposal/types";
import {
  getMockProposalById,
  getMockProposals,
} from "@/mock/worker/proposals";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getMyProposalsAction(): Promise<WorkerProposal[]> {
  if (USE_MOCK) {
    return getMockProposals();
  }

  try {
    return await withServerTokenRefresh((token) => getMyProposals(token));
  } catch (err) {
    if (!USE_MOCK) throw err;
    if (
      err instanceof ApiError &&
      (err.status === 404 ||
        err.status === 501 ||
        err.status === 502 ||
        err.status === 503)
    ) {
      return getMockProposals();
    }
    throw err;
  }
}

/**
 * Secure detail without GET /proposals/:id:
 * only returns the proposal if it is in the logged-in user's GET /proposals/me.
 */
export async function getMyProposalByIdAction(
  proposalId: string,
): Promise<WorkerProposal | null> {
  if (USE_MOCK) {
    return getMockProposalById(proposalId);
  }

  try {
    const proposals = await withServerTokenRefresh((token) => getMyProposals(token));
    return proposals.find((proposal) => proposal.id === proposalId) ?? null;
  } catch (err) {
    if (!USE_MOCK) throw err;
    if (
      err instanceof ApiError &&
      (err.status === 404 ||
        err.status === 501 ||
        err.status === 502 ||
        err.status === 503)
    ) {
      return getMockProposalById(proposalId);
    }
    throw err;
  }
}
