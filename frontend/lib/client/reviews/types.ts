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

export type ReviewResponse = {
  message: string;
  createdAt: string;
};

export type ProviderReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: ReviewReviewer;
  response?: ReviewResponse | null;
};

export type RawReviewResponse = {
  message: string;
  created_at: string;
} | null;

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
  response?: RawReviewResponse;
};

export type RawReviewsPage<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export type ReviewsPage<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export type RawReviewsSummary = {
  provider_id: string;
  average: number | null;
  total: number;
  distribution: Record<string, number>;
};
