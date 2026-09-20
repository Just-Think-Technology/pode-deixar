// Client proposals API — accept and reject fetchers

import { apiFetchAuth } from "@/api/client";
import type { ClientProposal } from "@/lib/client/orders/types";

export const CLIENT_PROPOSALS_ROUTES = {
  accept: (proposalId: string) => `/proposals/${proposalId}/accept`,
  reject: (proposalId: string) => `/proposals/${proposalId}/reject`,
} as const;

export function acceptProposal(accessToken: string, proposalId: string) {
  return apiFetchAuth<ClientProposal>(
    CLIENT_PROPOSALS_ROUTES.accept(proposalId),
    accessToken,
    { method: "POST" },
  );
}

export function rejectProposal(accessToken: string, proposalId: string) {
  return apiFetchAuth<ClientProposal>(
    CLIENT_PROPOSALS_ROUTES.reject(proposalId),
    accessToken,
    { method: "POST" },
  );
}