export type ProviderPublicService = {
  id: string;
  title: string;
  description: string;
  fixed_price: number;
  category_id: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
};

export type ProviderPublicProfile = {
  id: string;
  user: {
    id: string;
    complete_name: string;
    email: string;
    phone: string;
    postal_code: string;
  };
  avatar_url: string | null;
  bio: string | null;
  hourly_rate: number | null;
  skills: string[];
  rating: number;
  total_reviews: number;
  is_available: boolean;
  services: ProviderPublicService[];
  created_at: string;
  updated_at: string;
};
