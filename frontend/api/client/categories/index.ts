// Client categories API — service category fetcher

import { apiFetch } from "@/api/client";
import type { Category } from "@/lib/client/quote/types";

export function getCategories() {
  return apiFetch<Category[]>("/categories");
}