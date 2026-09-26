// Client categories API — service category fetcher

import { apiFetch } from "@/api/client/http";
import type { Category } from "@/lib/client/quote/types";
import { mockGetCategories } from "@/mock/client/categories";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const CATEGORIES_ROUTES = {
  list: "/categories",
} as const;

export function getCategories() {
  if (USE_MOCK) {
    return mockGetCategories();
  }

  return apiFetch<Category[]>(CATEGORIES_ROUTES.list);
}
