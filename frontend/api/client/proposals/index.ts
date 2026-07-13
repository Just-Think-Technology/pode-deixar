import { apiFetchAuth } from "@/api/client";
import type { ClientProposal } from "@/lib/client/orders/types";
import {
  mockAcceptProposal,
  mockRejectProposal,
} from "@/mock/client/orders";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const CLIENT_PROPOSALS_ROUTES = {
  accept: (proposalId: string) => `/proposals/${proposalId}/accept`,
  reject: (proposalId: string) => `/proposals/${proposalId}/reject`,
} as const;

export function acceptProposal(accessToken: string, proposalId: string) {
  if (USE_MOCK) {
    return Promise.resolve(mockAcceptProposal(proposalId));
  }

  return apiFetchAuth<ClientProposal>(
    CLIENT_PROPOSALS_ROUTES.accept(proposalId),
    accessToken,
    { method: "POST" },
  );
}

export function rejectProposal(accessToken: string, proposalId: string) {
  if (USE_MOCK) {
    return Promise.resolve(mockRejectProposal(proposalId));
  }

  return apiFetchAuth<ClientProposal>(
    CLIENT_PROPOSALS_ROUTES.reject(proposalId),
    accessToken,
    { method: "POST" },
  );
}
