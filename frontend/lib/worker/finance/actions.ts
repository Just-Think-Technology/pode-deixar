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
import {
  mockGetFinanceDashboard,
  mockListFinanceItems,
} from "@/mock/worker/finance";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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
