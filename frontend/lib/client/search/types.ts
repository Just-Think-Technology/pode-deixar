<<<<<<< HEAD
export type ProviderSearchResult = {
  id: string;
  user: {
    id: string;
    complete_name: string;
    email: string;
    phone: string;
    postal_code: string;
  };
  avatar_url: string | null;
  cover_image_url?: string | null;
  bio: string | null;
  hourly_rate: number | null;
  skills: string[];
  rating: number;
  total_reviews: number;
  is_available: boolean;
  services: Array<{
    id: string;
    title: string;
    description: string;
    fixed_price: number;
    category_id: string;
    category: { id: string; name: string; slug: string };
  }>;
};
=======
import type { LucideIcon } from "lucide-react";

import type { MockProfessional } from "@/mock/types";
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)

export type SearchProfessionalsPayload = {
  query?: string;
  categoryId?: string;
<<<<<<< HEAD
  page?: number;
  limit?: number;
};

export type SearchProfessionalsResponse = {
  professionals: ProviderSearchResult[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
=======
};

export type SearchProfessionalsResponse = {
  professionals: MockProfessional[];
  total: number;
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
};

export type PopularCategory = {
  id: string;
  label: string;
<<<<<<< HEAD
  iconKey: string;
=======
  icon: LucideIcon;
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
  iconClassName: string;
  iconBgClassName: string;
};
