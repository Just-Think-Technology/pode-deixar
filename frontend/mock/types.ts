export type StatMetric = {
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
};

export type MonthlyServiceData = {
  month: string;
  total: number;
};

export type ServiceCategory = {
  id: string;
  label: string;
};

export type MockService = {
  id: string;
  title: string;
  providerName: string;
  category: string;
  rating: number;
  reviewCount: number;
  priceLabel: string;
  imageSeed: string;
};

export type MockProfessional = {
  id: string;
  providerName: string;
  title: string;
  description: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  coverImageUrl: string;
  avatarImageUrl: string;
};
