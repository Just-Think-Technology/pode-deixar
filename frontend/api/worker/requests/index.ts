// Worker requests API — received request fetchers

import { apiFetchAuth } from "@/api/client";
import type {
  WorkerRequest,
  WorkerRequestsListResponse,
} from "@/lib/worker/requests/types";

export const WORKER_REQUESTS_ROUTES = {
  received: "/services/requests/received",
  byId: (orderId: string) => `/services/${orderId}`,
} as const;

export function getReceivedRequests(accessToken: string) {
  return apiFetchAuth<WorkerRequestsListResponse>(
    WORKER_REQUESTS_ROUTES.received,
    accessToken,
    { method: "GET" },
  );
}

export function getRequestById(
  accessToken: string,
  orderId: string,
): Promise<WorkerRequest | null> {
  return apiFetchAuth<WorkerRequest>(
    WORKER_REQUESTS_ROUTES.byId(orderId),
    accessToken,
    { method: "GET" },
  );
}