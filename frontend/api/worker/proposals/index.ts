// Worker proposals API — sent proposal fetchers

import { apiFetchAuth } from "@/api/client";
import type {
  WorkerProposal,
  WorkerProposalsListResponse,
} from "@/lib/worker/proposal/types";
import type { CreateProposalPayload } from "@/lib/worker/requests/types";

export const WORKER_PROPOSALS_ROUTES = {
  me: "/proposals/me",
  create: "/proposals",
} as const;

export function getMyProposals(accessToken: string) {
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