"use server";

import { ApiError } from "@/api/client";
import { getMyProposals } from "@/api/worker/proposals";
import {
  getAccessToken,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import type { WorkerProposal } from "@/lib/worker/proposal/types";
import {
  getMockProposalById,
  getMockProposals,
} from "@/mock/worker/proposals";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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
  if (USE_MOCK) {
    return getMockProposals();
  }

  try {
    return await withTokenRefresh((token) => getMyProposals(token));
  } catch (err) {
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
 * Detalhe seguro sem GET /proposals/:id:
 * só devolve a proposta se ela estiver em GET /proposals/me do usuário logado.
 */
export async function getMyProposalByIdAction(
  proposalId: string,
): Promise<WorkerProposal | null> {
  if (USE_MOCK) {
    return getMockProposalById(proposalId);
  }

  try {
    const proposals = await withTokenRefresh((token) => getMyProposals(token));
    return proposals.find((proposal) => proposal.id === proposalId) ?? null;
  } catch (err) {
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
