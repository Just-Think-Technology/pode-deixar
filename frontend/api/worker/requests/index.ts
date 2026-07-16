import { apiFetchAuth } from "@/api/client";
import type {
  WorkerRequest,
  WorkerRequestsListResponse,
} from "@/lib/worker/requests/types";
import {
  getMockReceivedRequests,
  getMockRequestById,
} from "@/mock/worker/requests";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const WORKER_REQUESTS_ROUTES = {
  received: "/services/requests/received",
  byId: (orderId: string) => `/services/${orderId}`,
} as const;

export function getReceivedRequests(accessToken: string) {
  if (USE_MOCK) {
    return Promise.resolve(getMockReceivedRequests());
  }

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
  if (USE_MOCK) {
    return Promise.resolve(getMockRequestById(orderId));
  }

  return apiFetchAuth<WorkerRequest>(
    WORKER_REQUESTS_ROUTES.byId(orderId),
    accessToken,
    { method: "GET" },
  );
}
