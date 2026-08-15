import {
  mockGetFinanceDashboard,
  mockListFinanceItems,
} from "@/mock/worker/finance";
import type {
  WorkerFinanceDashboard,
  WorkerFinanceItem,
} from "@/lib/worker/finance/types";
import type { WorkerPaymentStatus } from "@/lib/worker/payments/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * Financeiro do prestador — API ainda não existe (CLIENT-only em API.md).
 * Contrato futuro:
 * - GET /payments/provider/me/finance/summary
 * - GET /payments/provider/me/finance/items
 * - GET /payments/provider/me/finance/chart?months=6
 */
export function getWorkerFinanceDashboard(
  _accessToken: string,
): Promise<WorkerFinanceDashboard> {
  if (USE_MOCK) {
    return Promise.resolve(mockGetFinanceDashboard());
  }

  return Promise.reject(
    new Error(
      "Financeiro do prestador ainda não está disponível na API. Use NEXT_PUBLIC_USE_MOCK=true.",
    ),
  );
}

export function listWorkerFinanceItems(
  _accessToken: string,
  status?: WorkerPaymentStatus,
): Promise<WorkerFinanceItem[]> {
  if (USE_MOCK) {
    return Promise.resolve(mockListFinanceItems(status));
  }

  return Promise.reject(
    new Error(
      "Listagem financeira do prestador ainda não está disponível na API. Use NEXT_PUBLIC_USE_MOCK=true.",
    ),
  );
}
