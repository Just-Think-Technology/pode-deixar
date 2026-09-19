// Client payment actions — checkout and payment status

"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/api/client";
import {
  chargePayment,
  createPayment,
  getPaymentStatus,
} from "@/api/client/payments";
import {
  getAccessToken,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import type {
  ChargeResponse,
  CreatePaymentPayload,
  Payment,
  PaymentMethod,
  PaymentStatusResponse,
} from "@/lib/client/payments/types";

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

export async function createPaymentAction(
  serviceOrderId: string,
  method: PaymentMethod,
  scheduledAt: string,
  scheduledEndAt?: string,
): Promise<Payment> {
  const payload: CreatePaymentPayload = {
    serviceOrderId,
    method,
    scheduledAt,
    ...(scheduledEndAt ? { scheduledEndAt } : {}),
  };

  return withTokenRefresh((token) => createPayment(token, payload));
}

export async function chargePaymentAction(
  paymentId: string,
): Promise<ChargeResponse> {
  return withTokenRefresh((token) => chargePayment(token, paymentId));
}

export async function getPaymentStatusAction(
  paymentId: string,
): Promise<PaymentStatusResponse> {
  return withTokenRefresh((token) => getPaymentStatus(token, paymentId));
}

export async function startCheckoutAction(
  serviceOrderId: string,
  method: PaymentMethod,
  scheduledAt: string,
  scheduledEndAt?: string,
): Promise<{ payment: Payment; charge: ChargeResponse }> {
  const payment = await withTokenRefresh((token) =>
    createPayment(token, {
      serviceOrderId,
      method,
      scheduledAt,
      ...(scheduledEndAt ? { scheduledEndAt } : {}),
    }),
  );
  const charge = await withTokenRefresh((token) =>
    chargePayment(token, payment.id),
  );
  return { payment, charge };
}

export async function confirmPaymentAction(
  paymentId: string,
  orderId: string,
): Promise<PaymentStatusResponse> {
  const result = await withTokenRefresh((token) =>
    getPaymentStatus(token, paymentId),
  );
  revalidatePath(`/client/orders/${orderId}/checkout`);
  revalidatePath(`/client/orders/${orderId}/checkout/confirmation`);
  return result;
}
