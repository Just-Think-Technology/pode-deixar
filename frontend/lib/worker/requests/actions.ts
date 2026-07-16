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
import {
  getMockReceivedRequests,
  getMockRequestById,
  mockCreateProposal,
} from "@/mock/worker/requests";

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

function isInfraError(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 404 ||
      err.status === 501 ||
      err.status === 502 ||
      err.status === 503)
  );
}

export async function getReceivedRequestsAction(): Promise<WorkerRequest[]> {
  if (USE_MOCK) {
    return getMockReceivedRequests();
  }

  try {
    return await withTokenRefresh((token) => getReceivedRequests(token));
  } catch (err) {
    if (isInfraError(err)) {
      return getMockReceivedRequests();
    }
    throw err;
  }
}

export async function getReceivedRequestByIdAction(
  orderId: string,
): Promise<WorkerRequest | null> {
  if (USE_MOCK) {
    return getMockRequestById(orderId);
  }

  try {
    return await withTokenRefresh((token) => getRequestById(token, orderId));
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return null;
    }
    if (isInfraError(err)) {
      return getMockRequestById(orderId);
    }
    throw err;
  }
}

export async function createProposalAction(
  payload: CreateProposalPayload,
): Promise<WorkerProposal> {
  if (USE_MOCK) {
    return mockCreateProposal(payload);
  }

  try {
    return await withTokenRefresh((token) => createProposal(token, payload));
  } catch (err) {
    if (isInfraError(err)) {
      return mockCreateProposal(payload);
    }
    throw err;
  }
}
