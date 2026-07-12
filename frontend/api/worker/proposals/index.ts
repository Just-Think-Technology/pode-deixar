import { apiFetchAuth } from "@/api/client";
import type { WorkerProposalsListResponse } from "@/lib/worker/proposal/types";
import { getMockProposals } from "@/mock/worker/proposals";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const WORKER_PROPOSALS_ROUTES = {
  me: "/proposals/me",
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
