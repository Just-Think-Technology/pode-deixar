// Client payment types — payloads and gateway charge shapes
export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export type PaymentMethod = "PIX" | "CREDIT_CARD";

export type CreatePaymentPayload = {
  serviceOrderId: string;
  method: PaymentMethod;
  // Required by the backend (400 if missing) — set at checkout.
  scheduledAt: string;
  scheduledEndAt?: string;
};

export type Payment = {
  id: string;
  serviceOrderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  externalRef: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PixCharge = {
  pixCopiaECola: string;
  qrCodeBase64?: string;
  mercadoPagoId?: number;
};

export type CreditCardCharge = {
  linkCheckout: string;
};

export type ChargeResponse = {
  paymentId: string;
  chargeRef: string;
  status: PaymentStatus;
  cobranca: PixCharge | CreditCardCharge;
};

export type PaymentStatusResponse = {
  paymentId: string;
  serviceOrderId?: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  currency?: string;
  externalRef: string | null;
  paidAt: string | null;
  createdAt: string;
};

export function isPixCharge(
  charge: ChargeResponse["cobranca"],
): charge is PixCharge {
  return "pixCopiaECola" in charge;
}

export function isCreditCardCharge(
  charge: ChargeResponse["cobranca"],
): charge is CreditCardCharge {
  return "linkCheckout" in charge;
}
