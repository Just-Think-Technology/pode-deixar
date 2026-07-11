export type ProposalStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export type WorkerProposal = {
  id: string;
  service_order_id: string;
  provider_id: string;
  price: number;
  description: string;
  estimated_duration: string | null;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
};

export type WorkerProposalsListResponse = WorkerProposal[];
