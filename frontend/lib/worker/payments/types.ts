// Worker payment types — provider-facing receipt shapes
export type WorkerPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export type WorkerPaymentMethod = "PIX" | "CREDIT_CARD";

// Provider-facing payment status (mirrors the API.md shape).
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
