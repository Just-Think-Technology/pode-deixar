// Worker proposal actions — proposal list and secure detail

"use server";

import { ApiError } from "@/api/client";
import { getMyProposals } from "@/api/worker/proposals";
import {
  getAccessToken,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import type { WorkerProposal } from "@/lib/worker/proposal/types";

async function withTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    return await fn(token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const refreshed = await refreshAuthSession();
      if (!refreshed?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return await fn(refreshed.access_token);
    }
    throw err;
  }
}

export async function getMyProposalsAction(): Promise<WorkerProposal[]> {
  return withTokenRefresh((token) => getMyProposals(token));
}

/**
 * Secure detail without GET /proposals/:id:
 * only returns the proposal if it is in the logged-in user's GET /proposals/me.
 */
export async function getMyProposalByIdAction(
  proposalId: string,
): Promise<WorkerProposal | null> {
  const proposals = await withTokenRefresh((token) => getMyProposals(token));
  return proposals.find((proposal) => proposal.id === proposalId) ?? null;
}
