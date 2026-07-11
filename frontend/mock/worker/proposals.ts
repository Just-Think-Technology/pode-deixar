import type { WorkerProposal } from "@/lib/worker/proposal/types";

export const MOCK_PROPOSALS: WorkerProposal[] = [
  {
    id: "mock-proposal-001",
    service_order_id: "mock-order-001",
    provider_id: "mock-provider-id",
    price: 180.0,
    description:
      "Posso realizar o reparo hidráulico ainda esta semana, com garantia de 90 dias.",
    estimated_duration: "2 horas",
    status: "PENDING",
    created_at: "2026-07-01T10:00:00.000Z",
    updated_at: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "mock-proposal-002",
    service_order_id: "mock-order-002",
    provider_id: "mock-provider-id",
    price: 350.0,
    description:
      "Instalação completa do chuveiro elétrico, incluindo material básico.",
    estimated_duration: "3 horas",
    status: "ACCEPTED",
    created_at: "2026-06-28T14:30:00.000Z",
    updated_at: "2026-06-29T09:00:00.000Z",
  },
  {
    id: "mock-proposal-003",
    service_order_id: "mock-order-003",
    provider_id: "mock-provider-id",
    price: 120.0,
    description: "Troca de torneira e verificação de vazamentos na cozinha.",
    estimated_duration: "1 hora",
    status: "REJECTED",
    created_at: "2026-06-20T08:15:00.000Z",
    updated_at: "2026-06-21T11:00:00.000Z",
  },
  {
    id: "mock-proposal-004",
    service_order_id: "mock-order-004",
    provider_id: "mock-provider-id",
    price: 500.0,
    description: "Pintura de sala e corredor com tinta acrílica premium.",
    estimated_duration: "1 dia",
    status: "WITHDRAWN",
    created_at: "2026-06-15T16:00:00.000Z",
    updated_at: "2026-06-16T10:00:00.000Z",
  },
];

export function getMockProposals(): WorkerProposal[] {
  return MOCK_PROPOSALS;
}

export function getMockProposalById(id: string): WorkerProposal | null {
  return MOCK_PROPOSALS.find((proposal) => proposal.id === id) ?? null;
}
