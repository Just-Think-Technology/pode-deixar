// Worker request actions — request and proposal server actions

"use server";

import { ApiError } from "@/api/client/http";
import { withServerTokenRefresh } from "@/lib/auth/server-token-refresh";
import { createProposal } from "@/api/worker/proposals";
import {
  getReceivedRequests,
  getRequestById,
} from "@/api/worker/requests";
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
    return await withServerTokenRefresh((token) => getReceivedRequests(token));
  } catch (err) {
    if (!USE_MOCK) throw err;
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
    return await withServerTokenRefresh((token) => getRequestById(token, orderId));
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return null;
    }
    if (!USE_MOCK) throw err;
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
    return await withServerTokenRefresh((token) => createProposal(token, payload));
  } catch (err) {
    if (!USE_MOCK) throw err;
    if (isInfraError(err)) {
      return mockCreateProposal(payload);
    }
    throw err;
  }
}
