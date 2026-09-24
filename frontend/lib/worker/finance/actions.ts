// Worker finance actions — dashboard server actions

"use server";

import { ApiError } from "@/api/client/http";
import { withTokenRefresh } from "@/api/client/with-token-refresh";
import {
  getWorkerFinanceDashboard,
  listWorkerFinanceItems,
} from "@/api/worker/finance";
import type {
  WorkerFinanceDashboard,
  WorkerFinanceItem,
} from "@/lib/worker/finance/types";
import type { WorkerPaymentStatus } from "@/lib/worker/payments/types";
import {
  mockGetFinanceDashboard,
  mockListFinanceItems,
} from "@/mock/worker/finance";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getWorkerFinanceDashboardAction(): Promise<WorkerFinanceDashboard> {
  if (USE_MOCK) {
    return mockGetFinanceDashboard();
  }

  return withTokenRefresh((token) => getWorkerFinanceDashboard(token));
}

export async function listWorkerFinanceItemsAction(
  status?: WorkerPaymentStatus,
): Promise<WorkerFinanceItem[]> {
  if (USE_MOCK) {
    return mockListFinanceItems(status);
  }

  return withTokenRefresh((token) => listWorkerFinanceItems(token, status));
}
