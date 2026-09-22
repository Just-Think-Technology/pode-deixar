// Provider reviews types — public profile reputation shapes

export type ReviewDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export type ReviewsSummary = {
  average: number | null;
  total: number;
  distribution: ReviewDistribution;
};

export type ReviewReviewer = {
  displayName: string;
  avatarUrl: string | null;
};

export type ProviderReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: ReviewReviewer;
};

export type RawProviderReview = {
  id: string;
  service_order_id?: string;
  reviewer_id?: string;
  reviewee_id?: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  updated_at?: string;
  reviewer?: {
    display_name?: string | null;
    complete_name?: string | null;
    avatar_url?: string | null;
  } | null;
};
