import type { LucideIcon } from "lucide-react";

import type { MockProfessional } from "@/mock/types";

export type SearchProfessionalsPayload = {
  query?: string;
  categoryId?: string;
};

export type SearchProfessionalsResponse = {
  professionals: MockProfessional[];
  total: number;
};

export type PopularCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
};
