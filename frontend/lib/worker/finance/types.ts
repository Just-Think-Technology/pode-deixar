import type { WorkerPaymentMethod } from "@/lib/worker/payments/types";
import type { WorkerPaymentStatus } from "@/lib/worker/payments/types";

/** Taxa mock da plataforma (placeholder até a API existir). */
export const PLATFORM_FEE_RATE = 0.1;

export type WorkerFinancePayoutStatus = "AVAILABLE" | "CREDITED" | "NONE";

export type WorkerFinanceItem = {
  paymentId: string;
  proposalId: string;
  serviceOrderId: string;
  paymentStatus: WorkerPaymentStatus;
  payoutStatus: WorkerFinancePayoutStatus;
  method: WorkerPaymentMethod;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  feeRate: number;
  paidAt: string | null;
  createdAt: string;
};

export type WorkerFinanceSummary = {
  currency: string;
  feeRate: number;
  toReceiveNet: number;
  pendingNet: number;
  receivedThisMonthNet: number;
  feesThisMonth: number;
  grossToReceive: number;
  feesOnToReceive: number;
};

export type WorkerFinanceChartPoint = {
  month: string;
  netReceived: number;
  feesRetained: number;
};

export type WorkerFinanceCompositionPoint = {
  key: "pending" | "available" | "received";
  label: string;
  value: number;
};

export type WorkerFinanceDashboard = {
  summary: WorkerFinanceSummary;
  items: WorkerFinanceItem[];
  monthlyChart: WorkerFinanceChartPoint[];
  composition: WorkerFinanceCompositionPoint[];
};
