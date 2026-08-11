export type WorkerPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export type WorkerPaymentMethod = "PIX" | "CREDIT_CARD";

/** Status de pagamento visto pelo prestador (espelha shape de API.md). */
export type WorkerPaymentStatusResponse = {
  paymentId: string;
  serviceOrderId: string;
  proposalId: string;
  status: WorkerPaymentStatus;
  method: WorkerPaymentMethod;
  amount: number;
  currency: string;
  externalRef: string | null;
  paidAt: string | null;
  createdAt: string;
};
