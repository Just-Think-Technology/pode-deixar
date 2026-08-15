import { PLATFORM_FEE_RATE } from "@/lib/worker/finance/types";
import type { WorkerPaymentStatus } from "@/lib/worker/payments/types";

export function calculateFeeAmounts(
  grossAmount: number,
  feeRate: number = PLATFORM_FEE_RATE,
): { feeAmount: number; netAmount: number } {
  const feeAmount = roundMoney(grossAmount * feeRate);
  const netAmount = roundMoney(grossAmount - feeAmount);
  return { feeAmount, netAmount };
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatFinanceAmount(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatFinanceDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatFeeRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export const FINANCE_PAYMENT_STATUS_LABELS: Record<
  WorkerPaymentStatus,
  string
> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago pelo cliente",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
  CANCELLED: "Cancelado",
};

export function getFinancePaymentStatusLabel(status: string): string {
  return (
    FINANCE_PAYMENT_STATUS_LABELS[status as WorkerPaymentStatus] ?? status
  );
}
