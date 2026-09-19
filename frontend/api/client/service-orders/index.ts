// Client service orders API — order creation and lookup fetchers

import { apiFetchAuth } from "@/api/client";
import type {
  ClientOrder,
  ClientOrdersListResponse,
} from "@/lib/client/orders/types";
import type {
  CreateServiceOrderPayload,
  ServiceOrder,
} from "@/lib/client/quote/types";

export const SERVICE_ORDERS_ROUTES = {
  me: "/services/me",
  byId: (orderId: string) => `/services/me/${orderId}`,
} as const;

export function createServiceOrder(
  accessToken: string,
  payload: CreateServiceOrderPayload,
) {
  return apiFetchAuth<ServiceOrder>(SERVICE_ORDERS_ROUTES.me, accessToken, {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      categoryId: payload.categoryId,
      ...(payload.providerId ? { providerId: payload.providerId } : {}),
      ...(payload.budgetMin != null && { budgetMin: payload.budgetMin }),
      ...(payload.budgetMax != null && { budgetMax: payload.budgetMax }),
      ...(payload.address && { address: payload.address }),
    }),
  });
}

export function getMyServiceOrders(accessToken: string) {
  return apiFetchAuth<ClientOrdersListResponse>(
    SERVICE_ORDERS_ROUTES.me,
    accessToken,
    { method: "GET" },
  );
}

export function getMyServiceOrderById(
  accessToken: string,
  orderId: string,
): Promise<ClientOrder | null> {
  return apiFetchAuth<ClientOrder>(
    SERVICE_ORDERS_ROUTES.byId(orderId),
    accessToken,
    { method: "GET" },
  );
}