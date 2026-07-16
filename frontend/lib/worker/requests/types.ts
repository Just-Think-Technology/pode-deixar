export type ServiceOrderStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type WorkerRequest = {
  id: string;
  client_id: string;
  provider_id: string | null;
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
  status: ServiceOrderStatus | string;
  created_at: string;
  updated_at: string;
  proposals?: Array<{
    id: string;
    provider_id: string;
    price: number;
    description: string;
    estimated_duration: string | null;
    status: string;
    created_at: string;
  }>;
};

export type WorkerRequestsListResponse = WorkerRequest[];

export type CreateProposalPayload = {
  serviceOrderId: string;
  price: number;
  description: string;
  estimatedDuration?: string;
};
