// Worker finance actions — dashboard server actions

"use server";

import { ApiError } from "@/api/client";
import {
  getWorkerFinanceDashboard,
  listWorkerFinanceItems,
} from "@/api/worker/finance";
import {
  getAccessToken,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import type {
  WorkerFinanceDashboard,
  WorkerFinanceItem,
} from "@/lib/worker/finance/types";
import type { WorkerPaymentStatus } from "@/lib/worker/payments/types";

async function withTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    return await fn(token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const refreshed = await refreshAuthSession();
      if (!refreshed?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return await fn(refreshed.access_token);
    }
    throw err;
  }
}

export async function getWorkerFinanceDashboardAction(): Promise<WorkerFinanceDashboard> {
  return withTokenRefresh((token) => getWorkerFinanceDashboard(token));
}

export async function listWorkerFinanceItemsAction(
  status?: WorkerPaymentStatus,
): Promise<WorkerFinanceItem[]> {
  return withTokenRefresh((token) => listWorkerFinanceItems(token, status));
}