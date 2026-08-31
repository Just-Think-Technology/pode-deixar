import { apiFetchAuth } from "@/api/client";
import { formatChartMonth } from "@/lib/worker/finance/labels";
import type {
  WorkerFinanceChartPoint,
  WorkerFinanceCompositionPoint,
  WorkerFinanceDashboard,
  WorkerFinanceItem,
  WorkerFinanceSummary,
} from "@/lib/worker/finance/types";
import type { WorkerPaymentStatus } from "@/lib/worker/payments/types";
import {
  mockGetFinanceDashboard,
  mockListFinanceItems,
} from "@/mock/worker/finance";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const CHART_MONTHS_DEFAULT = 6;

export const WORKER_FINANCE_ROUTES = {
  summary: "/payments/provider/me/finance/summary",
  items: "/payments/provider/me/finance/items",
  chart: "/payments/provider/me/finance/chart",
} as const;

type ProviderFinanceItemResponse = Omit<WorkerFinanceItem, "proposalId"> & {
  proposalId?: string | null;
};

function itemsPath(status?: WorkerPaymentStatus): string {
  if (!status) {
    return WORKER_FINANCE_ROUTES.items;
  }
  return `${WORKER_FINANCE_ROUTES.items}?status=${encodeURIComponent(status)}`;
}

function chartPath(months: number): string {
  return `${WORKER_FINANCE_ROUTES.chart}?months=${months}`;
}

function mapFinanceItem(item: ProviderFinanceItemResponse): WorkerFinanceItem {
  return {
    ...item,
    proposalId: item.proposalId ?? "",
    paidAt: item.paidAt ?? null,
  };
}

function buildCompositionFromSummary(
  summary: WorkerFinanceSummary,
): WorkerFinanceCompositionPoint[] {
  const points: WorkerFinanceCompositionPoint[] = [
    { key: "pending", label: "Aguardando", value: summary.pendingNet },
    { key: "available", label: "Disponível", value: summary.toReceiveNet },
  ];
  return points.filter((point) => point.value > 0);
}

function mapChartPoint(point: WorkerFinanceChartPoint): WorkerFinanceChartPoint {
  return {
    ...point,
    month: formatChartMonth(point.month),
  };
}

export async function getWorkerFinanceDashboard(
  accessToken: string,
): Promise<WorkerFinanceDashboard> {
  if (USE_MOCK) {
    return mockGetFinanceDashboard();
  }

  const [summary, items, monthlyChart] = await Promise.all([
    apiFetchAuth<WorkerFinanceSummary>(
      WORKER_FINANCE_ROUTES.summary,
      accessToken,
      { method: "GET" },
    ),
    apiFetchAuth<ProviderFinanceItemResponse[]>(itemsPath(), accessToken, {
      method: "GET",
    }),
    apiFetchAuth<WorkerFinanceChartPoint[]>(
      chartPath(CHART_MONTHS_DEFAULT),
      accessToken,
      { method: "GET" },
    ),
  ]);

  return {
    summary,
    items: items.map(mapFinanceItem),
    monthlyChart: monthlyChart.map(mapChartPoint),
    composition: buildCompositionFromSummary(summary),
  };
}

export function listWorkerFinanceItems(
  accessToken: string,
  status?: WorkerPaymentStatus,
): Promise<WorkerFinanceItem[]> {
  if (USE_MOCK) {
    return Promise.resolve(mockListFinanceItems(status));
  }

  return apiFetchAuth<ProviderFinanceItemResponse[]>(
    itemsPath(status),
    accessToken,
    { method: "GET" },
  ).then((items) => items.map(mapFinanceItem));
}
