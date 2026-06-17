import {
  Briefcase,
  Car,
  Hammer,
  Home,
  Paintbrush,
  Wrench,
} from "lucide-react";

import type {
  PopularCategory,
  SearchProfessionalsPayload,
  SearchProfessionalsResponse,
} from "@/lib/client/search/types";
import { CLIENT_MOCK_PROFESSIONALS } from "@/mock/client/home";

export const POPULAR_CATEGORIES: PopularCategory[] = [
  {
    id: "limpeza",
    label: "Limpeza",
    icon: Home,
    iconBgClassName: "bg-blue-100",
    iconClassName: "text-blue-600",
  },
  {
    id: "pintura",
    label: "Pintura",
    icon: Paintbrush,
    iconBgClassName: "bg-purple-100",
    iconClassName: "text-purple-600",
  },
  {
    id: "eletrica",
    label: "Elétrica",
    icon: Wrench,
    iconBgClassName: "bg-amber-100",
    iconClassName: "text-amber-600",
  },
  {
    id: "construcao",
    label: "Construção",
    icon: Hammer,
    iconBgClassName: "bg-green-100",
    iconClassName: "text-green-600",
  },
  {
    id: "automotivo",
    label: "Automotivo",
    icon: Car,
    iconBgClassName: "bg-red-100",
    iconClassName: "text-red-600",
  },
  {
    id: "outros",
    label: "Outros",
    icon: Briefcase,
    iconBgClassName: "bg-gray-100",
    iconClassName: "text-gray-600",
  },
];

const CATEGORY_LABEL_BY_ID = Object.fromEntries(
  POPULAR_CATEGORIES.map((category) => [category.id, category.label]),
);

export function mockSearchProfessionals(
  payload: SearchProfessionalsPayload,
): SearchProfessionalsResponse {
  const query = payload.query?.trim().toLowerCase() ?? "";
  const categoryLabel = payload.categoryId
    ? CATEGORY_LABEL_BY_ID[payload.categoryId]
    : undefined;

  const professionals = CLIENT_MOCK_PROFESSIONALS.filter((professional) => {
    const matchesQuery =
      !query ||
      professional.title.toLowerCase().includes(query) ||
      professional.providerName.toLowerCase().includes(query) ||
      professional.description.toLowerCase().includes(query) ||
      professional.category.toLowerCase().includes(query);

    const matchesCategory =
      !categoryLabel ||
      (payload.categoryId === "outros"
        ? !POPULAR_CATEGORIES.slice(0, -1).some(
            (category) => category.label === professional.category,
          )
        : professional.category === categoryLabel);

    return matchesQuery && matchesCategory;
  });

  return {
    professionals,
    total: professionals.length,
  };
}
