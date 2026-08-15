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

/** Labels orientados a recebimento (painel do prestador — JTT-95). */
export const WORKER_RECEIPT_STATUS_LABELS: Record<
  WorkerPaymentStatus,
  string
> = {
  PENDING: "Aguardando",
  PAID: "Recebido",
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

export function getWorkerReceiptStatusLabel(status: string): string {
  return (
    WORKER_RECEIPT_STATUS_LABELS[status as WorkerPaymentStatus] ?? status
  );
}

export function formatWorkerPaymentDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
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
