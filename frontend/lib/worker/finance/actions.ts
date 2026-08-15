"use server";

import {
  getWorkerFinanceDashboard,
  listWorkerFinanceItems,
} from "@/api/worker/finance";
import { getAccessToken } from "@/lib/auth/session.server";
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

  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return getWorkerFinanceDashboard(token);
}

export async function listWorkerFinanceItemsAction(
  status?: WorkerPaymentStatus,
): Promise<WorkerFinanceItem[]> {
  if (USE_MOCK) {
    return mockListFinanceItems(status);
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return listWorkerFinanceItems(token, status);
}
