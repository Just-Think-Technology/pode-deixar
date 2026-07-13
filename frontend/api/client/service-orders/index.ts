import { apiFetchAuth } from "@/api/client";
import type {
  ClientOrder,
  ClientOrdersListResponse,
} from "@/lib/client/orders/types";
import type {
  CreateServiceOrderPayload,
  ServiceOrder,
} from "@/lib/client/quote/types";
import {
  getMockClientOrderById,
  getMockClientOrders,
} from "@/mock/client/orders";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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
      ...(payload.budgetMin != null && { budgetMin: payload.budgetMin }),
      ...(payload.budgetMax != null && { budgetMax: payload.budgetMax }),
    }),
  });
}

export function getMyServiceOrders(accessToken: string) {
  if (USE_MOCK) {
    return Promise.resolve(getMockClientOrders());
  }

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
  if (USE_MOCK) {
    return Promise.resolve(getMockClientOrderById(orderId));
  }

  return apiFetchAuth<ClientOrder>(
    SERVICE_ORDERS_ROUTES.byId(orderId),
    accessToken,
    { method: "GET" },
  );
}
