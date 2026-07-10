"use server";

import { ApiError } from "@/api/client";
import { createServiceOrder } from "@/api/client/service-orders";
import { getAccessToken } from "@/lib/auth/session.server";
import type {
  CreateServiceOrderPayload,
  ServiceOrder,
} from "@/lib/client/quote/types";
import { mockCreateServiceOrder } from "@/mock/client/service-orders";

async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  return token;
}

export async function createServiceOrderAction(
  payload: CreateServiceOrderPayload,
): Promise<ServiceOrder> {
  const token = await requireAccessToken();

  try {
    return await createServiceOrder(token, payload);
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 503)
    ) {
      return mockCreateServiceOrder(payload);
    }
    throw err;
  }
}
