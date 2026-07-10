export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  order?: number;
};

export type CreateServiceOrderPayload = {
  title: string;
  description: string;
  categoryId: string;
  budgetMin?: number;
  budgetMax?: number;
};

export type ServiceOrder = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category_id: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  budget_min: number | null;
  budget_max: number | null;
  address: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
};
