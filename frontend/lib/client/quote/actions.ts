"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/api/client";
import { createServiceOrder } from "@/api/client/service-orders";
import { getAccessToken } from "@/lib/auth/session.server";
import type {
  CreateServiceOrderPayload,
  ServiceOrder,
} from "@/lib/client/quote/types";
import { mockCreateServiceOrder } from "@/mock/client/service-orders";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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
  if (USE_MOCK) {
    const order = mockCreateServiceOrder(payload);
    revalidatePath("/client/orders");
    return order;
  }

  const token = await requireAccessToken();

  try {
    const order = await createServiceOrder(token, payload);
    revalidatePath("/client/orders");
    return order;
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 503)
    ) {
      const order = mockCreateServiceOrder(payload);
      revalidatePath("/client/orders");
      return order;
    }
    throw err;
  }
}
