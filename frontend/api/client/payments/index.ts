import { apiFetchAuth } from "@/api/client";
import type {
  ChargeResponse,
  CreatePaymentPayload,
  Payment,
  PaymentStatusResponse,
} from "@/lib/client/payments/types";
import {
  mockChargePayment,
  mockConfirmPayment,
  mockCreatePayment,
  mockGetPaymentStatus,
} from "@/mock/client/payments";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const CLIENT_PAYMENTS_ROUTES = {
  list: "/payments",
  create: "/payments",
  charge: (paymentId: string) => `/payments/${paymentId}/charge`,
  status: (paymentId: string) => `/payments/${paymentId}/status`,
} as const;

export function createPayment(
  accessToken: string,
  payload: CreatePaymentPayload,
) {
  if (USE_MOCK) {
    return Promise.resolve(mockCreatePayment(payload));
  }

  return apiFetchAuth<Payment>(CLIENT_PAYMENTS_ROUTES.create, accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function chargePayment(accessToken: string, paymentId: string) {
  if (USE_MOCK) {
    return Promise.resolve(mockChargePayment(paymentId));
  }

  return apiFetchAuth<ChargeResponse>(
    CLIENT_PAYMENTS_ROUTES.charge(paymentId),
    accessToken,
    { method: "POST" },
  );
}

export function getPaymentStatus(accessToken: string, paymentId: string) {
  if (USE_MOCK) {
    return Promise.resolve(mockGetPaymentStatus(paymentId));
  }

  return apiFetchAuth<PaymentStatusResponse>(
    CLIENT_PAYMENTS_ROUTES.status(paymentId),
    accessToken,
  );
}

/** Apenas mock/E2E — simula confirmação do webhook. */
export function confirmPaymentMock(paymentId: string) {
  if (!USE_MOCK) {
    return Promise.reject(
      new Error("Confirmação simulada disponível apenas em modo mock"),
    );
  }
  return Promise.resolve(mockConfirmPayment(paymentId));
}
