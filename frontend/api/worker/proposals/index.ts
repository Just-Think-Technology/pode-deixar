import { apiFetchAuth } from "@/api/client";
import type {
  WorkerProposal,
  WorkerProposalsListResponse,
} from "@/lib/worker/proposal/types";
import type { CreateProposalPayload } from "@/lib/worker/requests/types";
import { getMockProposals } from "@/mock/worker/proposals";
import { mockCreateProposal } from "@/mock/worker/requests";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const WORKER_PROPOSALS_ROUTES = {
  me: "/proposals/me",
  create: "/proposals",
} as const;

export function getMyProposals(accessToken: string) {
  if (USE_MOCK) {
    return Promise.resolve(getMockProposals());
  }

  return apiFetchAuth<WorkerProposalsListResponse>(
    WORKER_PROPOSALS_ROUTES.me,
    accessToken,
    { method: "GET" },
  );
}

export function createProposal(
  accessToken: string,
  payload: CreateProposalPayload,
) {
  if (USE_MOCK) {
    return Promise.resolve(mockCreateProposal(payload));
  }

  return apiFetchAuth<WorkerProposal>(
    WORKER_PROPOSALS_ROUTES.create,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        serviceOrderId: payload.serviceOrderId,
        price: payload.price,
        description: payload.description,
        ...(payload.estimatedDuration != null && {
          estimatedDuration: payload.estimatedDuration,
        }),
      }),
    },
  );
}
