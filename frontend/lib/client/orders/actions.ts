"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/api/client";
import {
  acceptProposal,
  rejectProposal,
} from "@/api/client/proposals";
import {
  getMyServiceOrderById,
  getMyServiceOrders,
} from "@/api/client/service-orders";
import {
  getAccessToken,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import type {
  ClientOrder,
  ClientProposal,
} from "@/lib/client/orders/types";
import {
  getMockClientOrderById,
  getMockClientOrders,
  mockAcceptProposal,
  mockRejectProposal,
} from "@/mock/client/orders";

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

export async function getMyOrdersAction(): Promise<ClientOrder[]> {
  if (USE_MOCK) {
    return getMockClientOrders();
  }

  try {
    return await withTokenRefresh((token) => getMyServiceOrders(token));
  } catch (err) {
    if (isInfraError(err)) {
      return getMockClientOrders();
    }
    throw err;
  }
}

export async function getMyOrderByIdAction(
  orderId: string,
): Promise<ClientOrder | null> {
  if (USE_MOCK) {
    return getMockClientOrderById(orderId);
  }

  try {
    return await withTokenRefresh((token) =>
      getMyServiceOrderById(token, orderId),
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return null;
    }
    if (isInfraError(err)) {
      return getMockClientOrderById(orderId);
    }
    throw err;
  }
}

export async function acceptProposalAction(
  proposalId: string,
  orderId: string,
): Promise<ClientProposal> {
  if (USE_MOCK) {
    const result = mockAcceptProposal(proposalId);
    revalidatePath("/client/orders");
    revalidatePath(`/client/orders/${orderId}`);
    return result;
  }

  try {
    const result = await withTokenRefresh((token) =>
      acceptProposal(token, proposalId),
    );
    revalidatePath("/client/orders");
    revalidatePath(`/client/orders/${orderId}`);
    return result;
  } catch (err) {
    if (isInfraError(err)) {
      const result = mockAcceptProposal(proposalId);
      revalidatePath("/client/orders");
      revalidatePath(`/client/orders/${orderId}`);
      return result;
    }
    throw err;
  }
}

export async function rejectProposalAction(
  proposalId: string,
  orderId: string,
): Promise<ClientProposal> {
  if (USE_MOCK) {
    const result = mockRejectProposal(proposalId);
    revalidatePath("/client/orders");
    revalidatePath(`/client/orders/${orderId}`);
    return result;
  }

  try {
    const result = await withTokenRefresh((token) =>
      rejectProposal(token, proposalId),
    );
    revalidatePath("/client/orders");
    revalidatePath(`/client/orders/${orderId}`);
    return result;
  } catch (err) {
    if (isInfraError(err)) {
      const result = mockRejectProposal(proposalId);
      revalidatePath("/client/orders");
      revalidatePath(`/client/orders/${orderId}`);
      return result;
    }
    throw err;
  }
}
