// Worker request actions — request and proposal server actions

"use server";

import { ApiError } from "@/api/client";
import { createProposal } from "@/api/worker/proposals";
import {
  getReceivedRequests,
  getRequestById,
} from "@/api/worker/requests";
import {
  getAccessToken,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import type { WorkerProposal } from "@/lib/worker/proposal/types";
import type {
  CreateProposalPayload,
  WorkerRequest,
} from "@/lib/worker/requests/types";

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

export async function getReceivedRequestsAction(): Promise<WorkerRequest[]> {
  return withTokenRefresh((token) => getReceivedRequests(token));
}

export async function getReceivedRequestByIdAction(
  orderId: string,
): Promise<WorkerRequest | null> {
  try {
    return await withTokenRefresh((token) => getRequestById(token, orderId));
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return null;
    }
    throw err;
  }
}

export async function createProposalAction(
  payload: CreateProposalPayload,
): Promise<WorkerProposal> {
  return withTokenRefresh((token) => createProposal(token, payload));
}
