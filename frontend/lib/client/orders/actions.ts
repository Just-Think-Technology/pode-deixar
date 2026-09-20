// Client order actions — order listing and detail

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

export async function getMyOrdersAction(): Promise<ClientOrder[]> {
  return withTokenRefresh((token) => getMyServiceOrders(token));
}

export async function getMyOrderByIdAction(
  orderId: string,
): Promise<ClientOrder | null> {
  try {
    return await withTokenRefresh((token) =>
      getMyServiceOrderById(token, orderId),
    );
  } catch (err) {
    // 400 = ownership (API.md / future fix); 403/404 = no access / not found
    if (
      err instanceof ApiError &&
      (err.status === 400 || err.status === 403 || err.status === 404)
    ) {
      return null;
    }
    throw err;
  }
}

export async function acceptProposalAction(
  proposalId: string,
  orderId: string,
): Promise<ClientProposal> {
  const result = await withTokenRefresh((token) =>
    acceptProposal(token, proposalId),
  );
  revalidatePath("/client/orders");
  revalidatePath(`/client/orders/${orderId}`);
  return result;
}

export async function rejectProposalAction(
  proposalId: string,
  orderId: string,
): Promise<ClientProposal> {
  const result = await withTokenRefresh((token) =>
    rejectProposal(token, proposalId),
  );
  revalidatePath("/client/orders");
  revalidatePath(`/client/orders/${orderId}`);
  return result;
}
