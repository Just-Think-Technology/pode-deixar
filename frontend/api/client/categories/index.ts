import { apiFetch } from "@/api/client";
import type { Category } from "@/lib/client/quote/types";
import { mockGetCategories } from "@/mock/client/categories";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function getCategories() {
  if (USE_MOCK) {
    return mockGetCategories();
  }

  return apiFetch<Category[]>("/categories");
}
