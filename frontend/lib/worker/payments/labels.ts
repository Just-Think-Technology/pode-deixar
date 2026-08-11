import type {
  WorkerPaymentMethod,
  WorkerPaymentStatus,
} from "@/lib/worker/payments/types";

export const WORKER_PAYMENT_STATUS_LABELS: Record<
  WorkerPaymentStatus,
  string
> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
  CANCELLED: "Cancelado",
};

export const WORKER_PAYMENT_METHOD_LABELS: Record<
  WorkerPaymentMethod,
  string
> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
};

export function getWorkerPaymentStatusLabel(status: string): string {
  return (
    WORKER_PAYMENT_STATUS_LABELS[status as WorkerPaymentStatus] ?? status
  );
}

export function getWorkerPaymentMethodLabel(method: string): string {
  return (
    WORKER_PAYMENT_METHOD_LABELS[method as WorkerPaymentMethod] ?? method
  );
}

export function formatWorkerPaymentAmount(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
