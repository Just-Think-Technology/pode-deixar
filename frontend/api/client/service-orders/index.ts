import { apiFetchAuth } from "@/api/client";
import type {
  CreateServiceOrderPayload,
  ServiceOrder,
} from "@/lib/client/quote/types";

export const SERVICE_ORDERS_ROUTES = {
  me: "/services/me",
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
