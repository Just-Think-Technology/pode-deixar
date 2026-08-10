"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/api/client";
import {
  chargePayment,
  confirmPaymentMock,
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
import {
  mockChargePayment,
  mockConfirmPayment,
  mockCreatePayment,
  mockFindPendingPaymentByOrder,
  mockGetPaymentStatus,
} from "@/mock/client/payments";

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

export async function createPaymentAction(
  serviceOrderId: string,
  method: PaymentMethod,
): Promise<Payment> {
  const payload: CreatePaymentPayload = { serviceOrderId, method };

  if (USE_MOCK) {
    return mockCreatePayment(payload);
  }

  try {
    return await withTokenRefresh((token) => createPayment(token, payload));
  } catch (err) {
    if (isInfraError(err)) {
      return mockCreatePayment(payload);
    }
    throw err;
  }
}

export async function chargePaymentAction(
  paymentId: string,
): Promise<ChargeResponse> {
  if (USE_MOCK) {
    return mockChargePayment(paymentId);
  }

  try {
    return await withTokenRefresh((token) => chargePayment(token, paymentId));
  } catch (err) {
    if (isInfraError(err)) {
      return mockChargePayment(paymentId);
    }
    throw err;
  }
}

export async function getPaymentStatusAction(
  paymentId: string,
): Promise<PaymentStatusResponse> {
  if (USE_MOCK) {
    return mockGetPaymentStatus(paymentId);
  }

  try {
    return await withTokenRefresh((token) =>
      getPaymentStatus(token, paymentId),
    );
  } catch (err) {
    if (isInfraError(err)) {
      return mockGetPaymentStatus(paymentId);
    }
    throw err;
  }
}

/** Simula webhook mock — só funciona com NEXT_PUBLIC_USE_MOCK=true. */
export async function confirmPaymentMockAction(
  paymentId: string,
  orderId: string,
): Promise<PaymentStatusResponse> {
  if (USE_MOCK) {
    const result = mockConfirmPayment(paymentId);
    revalidatePath(`/client/orders/${orderId}/checkout`);
    revalidatePath(`/client/orders/${orderId}/checkout/confirmation`);
    return result;
  }

  return confirmPaymentMock(paymentId);
}

export async function startCheckoutAction(
  serviceOrderId: string,
  method: PaymentMethod,
): Promise<{ payment: Payment; charge: ChargeResponse }> {
  if (USE_MOCK) {
    const existing = mockFindPendingPaymentByOrder(serviceOrderId);
    const payment =
      existing && existing.method === method
        ? existing
        : mockCreatePayment({ serviceOrderId, method });
    const charge = mockChargePayment(payment.id);
    return { payment, charge };
  }

  try {
    const payment = await withTokenRefresh((token) =>
      createPayment(token, { serviceOrderId, method }),
    );
    const charge = await withTokenRefresh((token) =>
      chargePayment(token, payment.id),
    );
    return { payment, charge };
  } catch (err) {
    if (isInfraError(err)) {
      const payment = mockCreatePayment({ serviceOrderId, method });
      const charge = mockChargePayment(payment.id);
      return { payment, charge };
    }
    throw err;
  }
}
