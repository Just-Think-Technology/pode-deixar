import { calculateFeeAmounts } from "@/lib/worker/finance/labels";
import type {
  WorkerFinanceChartPoint,
  WorkerFinanceCompositionPoint,
  WorkerFinanceDashboard,
  WorkerFinanceItem,
  WorkerFinanceSummary,
} from "@/lib/worker/finance/types";
import { PLATFORM_FEE_RATE } from "@/lib/worker/finance/types";

function buildItem(
  partial: Omit<
    WorkerFinanceItem,
    "feeAmount" | "netAmount" | "feeRate"
  > & { feeRate?: number },
): WorkerFinanceItem {
  const feeRate = partial.feeRate ?? PLATFORM_FEE_RATE;
  const { feeAmount, netAmount } = calculateFeeAmounts(
    partial.grossAmount,
    feeRate,
  );
  return {
    ...partial,
    feeRate,
    feeAmount,
    netAmount,
  };
}

/**
 * Seeds financeiros do prestador (JTT-95).
 * Taxa mock 10%. Proposta mock-proposal-002 alinhada ao JTT-93.
 */
const SEEDED_ITEMS: WorkerFinanceItem[] = [
  buildItem({
    paymentId: "mock-finance-002",
    proposalId: "mock-proposal-002",
    serviceOrderId: "mock-order-002",
    paymentStatus: "PAID",
    payoutStatus: "AVAILABLE",
    method: "PIX",
    grossAmount: 350,
    paidAt: "2026-08-05T12:00:00.000Z",
    createdAt: "2026-08-05T11:30:00.000Z",
  }),
  buildItem({
    paymentId: "mock-finance-006",
    proposalId: "mock-proposal-006",
    serviceOrderId: "mock-order-006",
    paymentStatus: "PENDING",
    payoutStatus: "NONE",
    method: "PIX",
    grossAmount: 220,
    paidAt: null,
    createdAt: "2026-08-08T09:00:00.000Z",
  }),
  buildItem({
    paymentId: "mock-finance-010",
    proposalId: "mock-proposal-010",
    serviceOrderId: "mock-order-010",
    paymentStatus: "PAID",
    payoutStatus: "CREDITED",
    method: "PIX",
    grossAmount: 500,
    paidAt: "2026-08-02T16:00:00.000Z",
    createdAt: "2026-08-02T15:00:00.000Z",
  }),
  buildItem({
    paymentId: "mock-finance-011",
    proposalId: "mock-proposal-011",
    serviceOrderId: "mock-order-011",
    paymentStatus: "PAID",
    payoutStatus: "CREDITED",
    method: "CREDIT_CARD",
    grossAmount: 280,
    paidAt: "2026-07-18T10:00:00.000Z",
    createdAt: "2026-07-17T14:00:00.000Z",
  }),
  buildItem({
    paymentId: "mock-finance-007",
    proposalId: "mock-proposal-007",
    serviceOrderId: "mock-order-007",
    paymentStatus: "FAILED",
    payoutStatus: "NONE",
    method: "CREDIT_CARD",
    grossAmount: 480,
    paidAt: null,
    createdAt: "2026-07-05T15:20:00.000Z",
  }),
  buildItem({
    paymentId: "mock-finance-008",
    proposalId: "mock-proposal-008",
    serviceOrderId: "mock-order-008",
    paymentStatus: "REFUNDED",
    payoutStatus: "NONE",
    method: "PIX",
    grossAmount: 150,
    paidAt: "2026-06-18T10:00:00.000Z",
    createdAt: "2026-06-17T14:00:00.000Z",
  }),
  buildItem({
    paymentId: "mock-finance-009",
    proposalId: "mock-proposal-009",
    serviceOrderId: "mock-order-009",
    paymentStatus: "CANCELLED",
    payoutStatus: "NONE",
    method: "PIX",
    grossAmount: 90,
    paidAt: null,
    createdAt: "2026-06-12T11:00:00.000Z",
  }),
];

const SEEDED_MONTHLY: WorkerFinanceChartPoint[] = [
  { month: "Mar", netReceived: 180, feesRetained: 20 },
  { month: "Abr", netReceived: 270, feesRetained: 30 },
  { month: "Mai", netReceived: 405, feesRetained: 45 },
  { month: "Jun", netReceived: 135, feesRetained: 15 },
  { month: "Jul", netReceived: 252, feesRetained: 28 },
  { month: "Ago", netReceived: 450, feesRetained: 50 },
];

type MockFinanceGlobal = typeof globalThis & {
  __podeDeixarMockWorkerFinance?: WorkerFinanceItem[];
};

function getItems(): WorkerFinanceItem[] {
  const g = globalThis as MockFinanceGlobal;
  if (!g.__podeDeixarMockWorkerFinance) {
    g.__podeDeixarMockWorkerFinance = SEEDED_ITEMS.map((item) => ({
      ...item,
    }));
  }
  return g.__podeDeixarMockWorkerFinance;
}

export function resetMockWorkerFinance() {
  const g = globalThis as MockFinanceGlobal;
  g.__podeDeixarMockWorkerFinance = SEEDED_ITEMS.map((item) => ({ ...item }));
}

function sumNet(items: WorkerFinanceItem[]): number {
  return items.reduce((acc, item) => acc + item.netAmount, 0);
}

function sumFee(items: WorkerFinanceItem[]): number {
  return items.reduce((acc, item) => acc + item.feeAmount, 0);
}

function sumGross(items: WorkerFinanceItem[]): number {
  return items.reduce((acc, item) => acc + item.grossAmount, 0);
}

function isSameMonth(iso: string, reference: Date): boolean {
  const date = new Date(iso);
  return (
    date.getUTCFullYear() === reference.getUTCFullYear() &&
    date.getUTCMonth() === reference.getUTCMonth()
  );
}

function buildSummary(items: WorkerFinanceItem[]): WorkerFinanceSummary {
  const now = new Date("2026-08-11T12:00:00.000Z");
  const available = items.filter(
    (item) =>
      item.paymentStatus === "PAID" && item.payoutStatus === "AVAILABLE",
  );
  const pending = items.filter((item) => item.paymentStatus === "PENDING");
  const creditedThisMonth = items.filter(
    (item) =>
      item.payoutStatus === "CREDITED" &&
      item.paidAt != null &&
      isSameMonth(item.paidAt, now),
  );
  const paidThisMonth = items.filter(
    (item) =>
      item.paymentStatus === "PAID" &&
      item.paidAt != null &&
      isSameMonth(item.paidAt, now),
  );

  return {
    currency: "BRL",
    feeRate: PLATFORM_FEE_RATE,
    toReceiveNet: sumNet(available),
    pendingNet: sumNet(pending),
    receivedThisMonthNet: sumNet(creditedThisMonth),
    feesThisMonth: sumFee(paidThisMonth),
    grossToReceive: sumGross(available),
    feesOnToReceive: sumFee(available),
  };
}

function buildComposition(
  summary: WorkerFinanceSummary,
  items: WorkerFinanceItem[],
): WorkerFinanceCompositionPoint[] {
  const creditedAll = sumNet(
    items.filter((item) => item.payoutStatus === "CREDITED"),
  );
  const points: WorkerFinanceCompositionPoint[] = [
    { key: "pending", label: "Aguardando", value: summary.pendingNet },
    { key: "available", label: "Disponível", value: summary.toReceiveNet },
    { key: "received", label: "Já recebido", value: creditedAll },
  ];
  return points.filter((point) => point.value > 0);
}

export function mockListFinanceItems(
  status?: WorkerFinanceItem["paymentStatus"],
): WorkerFinanceItem[] {
  const items = getItems()
    .map((item) => ({ ...item }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  if (!status) return items;
  return items.filter((item) => item.paymentStatus === status);
}

export function mockGetFinanceChart(): WorkerFinanceChartPoint[] {
  return SEEDED_MONTHLY.map((point) => ({ ...point }));
}

export function mockGetFinanceDashboard(): WorkerFinanceDashboard {
  const items = mockListFinanceItems();
  const summary = buildSummary(items);
  return {
    summary,
    items,
    monthlyChart: mockGetFinanceChart(),
    composition: buildComposition(summary, items),
  };
}
