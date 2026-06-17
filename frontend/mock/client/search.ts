<<<<<<< HEAD
=======
import {
  Briefcase,
  Car,
  Hammer,
  Home,
  Paintbrush,
  Wrench,
} from "lucide-react";

>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
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
<<<<<<< HEAD
    iconKey: "home",
=======
    icon: Home,
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
    iconBgClassName: "bg-blue-100",
    iconClassName: "text-blue-600",
  },
  {
    id: "pintura",
    label: "Pintura",
<<<<<<< HEAD
    iconKey: "paintbrush",
=======
    icon: Paintbrush,
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
    iconBgClassName: "bg-purple-100",
    iconClassName: "text-purple-600",
  },
  {
    id: "eletrica",
    label: "Elétrica",
<<<<<<< HEAD
    iconKey: "wrench",
=======
    icon: Wrench,
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
    iconBgClassName: "bg-amber-100",
    iconClassName: "text-amber-600",
  },
  {
    id: "construcao",
    label: "Construção",
<<<<<<< HEAD
    iconKey: "hammer",
=======
    icon: Hammer,
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
    iconBgClassName: "bg-green-100",
    iconClassName: "text-green-600",
  },
  {
    id: "automotivo",
    label: "Automotivo",
<<<<<<< HEAD
    iconKey: "car",
=======
    icon: Car,
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
    iconBgClassName: "bg-red-100",
    iconClassName: "text-red-600",
  },
  {
    id: "outros",
    label: "Outros",
<<<<<<< HEAD
    iconKey: "briefcase",
=======
    icon: Briefcase,
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
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
<<<<<<< HEAD
      professional.user.complete_name.toLowerCase().includes(query) ||
      professional.bio?.toLowerCase().includes(query) ||
      professional.skills.some((skill) => skill.toLowerCase().includes(query));

    const categoryName = professional.services[0]?.category.name ?? "";
=======
      professional.title.toLowerCase().includes(query) ||
      professional.providerName.toLowerCase().includes(query) ||
      professional.description.toLowerCase().includes(query) ||
      professional.category.toLowerCase().includes(query);

>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
    const matchesCategory =
      !categoryLabel ||
      (payload.categoryId === "outros"
        ? !POPULAR_CATEGORIES.slice(0, -1).some(
<<<<<<< HEAD
            (cat) => cat.label === categoryName,
          )
        : categoryName === categoryLabel);
=======
            (category) => category.label === professional.category,
          )
        : professional.category === categoryLabel);
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)

    return matchesQuery && matchesCategory;
  });

  return {
    professionals,
    total: professionals.length,
  };
<<<<<<< HEAD
}
=======
}
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
