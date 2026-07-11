import { apiFetchAuth } from "@/api/client";
import type { WorkerProposalsListResponse } from "@/lib/worker/proposal/types";

export const WORKER_PROPOSALS_ROUTES = {
  me: "/proposals/me",
} as const;

export function getMyProposals(accessToken: string) {
  return apiFetchAuth<WorkerProposalsListResponse>(
    WORKER_PROPOSALS_ROUTES.me,
    accessToken,
    { method: "GET" },
  );
}
