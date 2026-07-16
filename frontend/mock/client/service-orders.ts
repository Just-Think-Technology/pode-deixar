import type {
  CreateServiceOrderPayload,
  ServiceOrder,
} from "@/lib/client/quote/types";
import type { ClientOrder } from "@/lib/client/orders/types";
import { MOCK_CATEGORIES } from "@/mock/client/categories";
import { appendMockClientOrder } from "@/mock/client/orders";

export function mockCreateServiceOrder(
  payload: CreateServiceOrderPayload,
): ServiceOrder {
  const category =
    MOCK_CATEGORIES.find((item) => item.id === payload.categoryId) ??
    MOCK_CATEGORIES[0];

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const clientOrder: ClientOrder = {
    id,
    client_id: "mock-client-id",
    provider_id: null,
    title: payload.title,
    description: payload.description,
    category_id: category.id,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
    },
    budget_min: payload.budgetMin ?? null,
    budget_max: payload.budgetMax ?? null,
    address: {},
    status: "OPEN",
    created_at: now,
    updated_at: now,
    proposals: [],
  };

  appendMockClientOrder(clientOrder);

  return {
    id: clientOrder.id,
    client_id: clientOrder.client_id,
    title: clientOrder.title,
    description: clientOrder.description,
    category_id: clientOrder.category_id,
    category: clientOrder.category,
    budget_min: clientOrder.budget_min,
    budget_max: clientOrder.budget_max,
    address: clientOrder.address,
    status: clientOrder.status,
    created_at: clientOrder.created_at,
    updated_at: clientOrder.updated_at,
  };
}
