import type {
  CreateServiceOrderPayload,
  ServiceOrder,
} from "@/lib/client/quote/types";
import { MOCK_CATEGORIES } from "@/mock/client/categories";

export function mockCreateServiceOrder(
  payload: CreateServiceOrderPayload,
): ServiceOrder {
  const category =
    MOCK_CATEGORIES.find((item) => item.id === payload.categoryId) ??
    MOCK_CATEGORIES[0];

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    client_id: "mock-client-id",
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
  };
}
