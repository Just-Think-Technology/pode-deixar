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
  /** Obrigatório no backend (400 se ausente) — o fluxo de agendamento no checkout preenche. */
  scheduledAt?: string;
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

export type ChargeCobrancaPix = {
  pixCopiaECola: string;
  qrCodeBase64?: string;
  mercadoPagoId?: number;
};

export type ChargeCobrancaCreditCard = {
  linkCheckout: string;
};

export type ChargeResponse = {
  paymentId: string;
  chargeRef: string;
  status: PaymentStatus;
  cobranca: ChargeCobrancaPix | ChargeCobrancaCreditCard;
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

export function isPixCobranca(
  cobranca: ChargeResponse["cobranca"],
): cobranca is ChargeCobrancaPix {
  return "pixCopiaECola" in cobranca;
}

export function isCreditCardCobranca(
  cobranca: ChargeResponse["cobranca"],
): cobranca is ChargeCobrancaCreditCard {
  return "linkCheckout" in cobranca;
}
