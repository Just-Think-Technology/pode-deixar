// Client payments API — charge, status, and payment creation

import { apiFetchAuth } from "@/api/client";
import type {
  ChargeResponse,
  CreatePaymentPayload,
  Payment,
  PaymentStatusResponse,
} from "@/lib/client/payments/types";

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
  return apiFetchAuth<Payment>(CLIENT_PAYMENTS_ROUTES.create, accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function chargePayment(accessToken: string, paymentId: string) {
  return apiFetchAuth<ChargeResponse>(
    CLIENT_PAYMENTS_ROUTES.charge(paymentId),
    accessToken,
    { method: "POST" },
  );
}

export function getPaymentStatus(accessToken: string, paymentId: string) {
  return apiFetchAuth<PaymentStatusResponse>(
    CLIENT_PAYMENTS_ROUTES.status(paymentId),
    accessToken,
  );
}
