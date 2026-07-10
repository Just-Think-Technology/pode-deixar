import type { Category } from "@/lib/client/quote/types";

export const MOCK_CATEGORIES: Category[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    name: "Limpeza",
    slug: "limpeza",
    description: "Serviços de limpeza residencial e comercial",
    icon: "home",
    order: 1,
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    name: "Pintura",
    slug: "pintura",
    description: "Pintura residencial e comercial",
    icon: "paintbrush",
    order: 2,
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    name: "Elétrica",
    slug: "eletrica",
    description: "Serviços de elétrica residencial e comercial",
    icon: "zap",
    order: 3,
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    name: "Hidráulica",
    slug: "hidraulica",
    description: "Serviços de encanamento e hidráulica",
    icon: "wrench",
    order: 4,
  },
  {
    id: "a1000000-0000-4000-8000-000000000005",
    name: "Marcenaria",
    slug: "marcenaria",
    description: "Móveis sob medida e reparos em madeira",
    icon: "hammer",
    order: 5,
  },
  {
    id: "a1000000-0000-4000-8000-000000000006",
    name: "Automotivo",
    slug: "automotivo",
    description: "Serviços automotivos diversos",
    icon: "car",
    order: 6,
  },
];

export async function mockGetCategories(): Promise<Category[]> {
  return MOCK_CATEGORIES;
}
