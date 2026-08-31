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

const CHART_MONTH_ISO = /^(\d{4})-(\d{2})$/;

/** Converte `YYYY-MM` em `mar/26`. Rótulos curtos do mock (`Mar`) ficam inalterados. */
export function formatChartMonth(month: string): string {
  const match = CHART_MONTH_ISO.exec(month);
  if (!match) {
    return month;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const date = new Date(Date.UTC(year, monthIndex, 1));
  const shortMonth = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "")
    .trim();

  return `${shortMonth}/${String(year).slice(-2)}`;
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
