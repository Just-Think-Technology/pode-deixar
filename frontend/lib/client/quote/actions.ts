// Client quote actions — quote request server actions

"use server";

import { revalidatePath } from "next/cache";

import { createServiceOrder } from "@/api/client/service-orders";
import { getAccessToken } from "@/lib/auth/session.server";
import type {
  CreateServiceOrderPayload,
  ServiceOrder,
} from "@/lib/client/quote/types";

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
  const order = await createServiceOrder(token, payload);
  revalidatePath("/client/orders");
  return order;
}
