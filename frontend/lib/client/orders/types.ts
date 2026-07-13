export type ServiceOrderStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ProposalStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export type ClientOrderProposal = {
  id: string;
  provider_id: string;
  price: number;
  description: string;
  estimated_duration: string | null;
  status: ProposalStatus | string;
  created_at: string;
};

export type ClientOrder = {
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
  proposals?: ClientOrderProposal[];
};

export type ClientOrdersListResponse = ClientOrder[];

export type ClientProposal = {
  id: string;
  service_order_id: string;
  provider_id: string;
  price: number;
  description: string;
  estimated_duration: string | null;
  status: ProposalStatus | string;
  created_at: string;
  updated_at: string;
};
