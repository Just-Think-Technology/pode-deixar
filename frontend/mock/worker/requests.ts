import type {
  CreateProposalPayload,
  WorkerRequest,
} from "@/lib/worker/requests/types";
import type { WorkerProposal } from "@/lib/worker/proposal/types";

export const MOCK_RECEIVED_REQUESTS: WorkerRequest[] = [
  {
    id: "mock-request-001",
    client_id: "mock-client-id",
    provider_id: "mock-provider-id",
    title: "Conserto de vazamento no chuveiro",
    description:
      "O chuveiro está vazando pela base e precisa de reparo urgente. Preferência por atendimento ainda esta semana.",
    category_id: "a1000000-0000-4000-8000-000000000004",
    category: {
      id: "a1000000-0000-4000-8000-000000000004",
      name: "Hidráulica",
      slug: "hidraulica",
    },
    budget_min: 80,
    budget_max: 250,
    address: {},
    status: "OPEN",
    created_at: "2026-07-10T10:00:00.000Z",
    updated_at: "2026-07-10T10:00:00.000Z",
    proposals: [],
  },
  {
    id: "mock-request-002",
    client_id: "mock-client-id-2",
    provider_id: "mock-provider-id",
    title: "Instalação de tomadas na cozinha",
    description:
      "Preciso instalar três tomadas novas na parede da cozinha, com disjuntor dedicado se necessário.",
    category_id: "a1000000-0000-4000-8000-000000000003",
    category: {
      id: "a1000000-0000-4000-8000-000000000003",
      name: "Elétrica",
      slug: "eletrica",
    },
    budget_min: 100,
    budget_max: 300,
    address: {},
    status: "OPEN",
    created_at: "2026-07-09T14:30:00.000Z",
    updated_at: "2026-07-09T14:30:00.000Z",
    proposals: [],
  },
  {
    id: "mock-request-003",
    client_id: "mock-client-id-3",
    provider_id: "mock-provider-id",
    title: "Pintura de quarto infantil",
    description:
      "Quarto de aproximadamente 12m². Inclui preparação da parede e duas demãos de tinta.",
    category_id: "a1000000-0000-4000-8000-000000000002",
    category: {
      id: "a1000000-0000-4000-8000-000000000002",
      name: "Pintura",
      slug: "pintura",
    },
    budget_min: 200,
    budget_max: 450,
    address: {},
    status: "IN_PROGRESS",
    created_at: "2026-07-01T09:00:00.000Z",
    updated_at: "2026-07-05T11:00:00.000Z",
    proposals: [],
  },
];

export function getMockReceivedRequests(): WorkerRequest[] {
  return MOCK_RECEIVED_REQUESTS;
}

export function getMockRequestById(id: string): WorkerRequest | null {
  return MOCK_RECEIVED_REQUESTS.find((request) => request.id === id) ?? null;
}

export function mockCreateProposal(
  payload: CreateProposalPayload,
): WorkerProposal {
  const now = new Date().toISOString();

  return {
    id: `mock-proposal-${Date.now()}`,
    service_order_id: payload.serviceOrderId,
    provider_id: "mock-provider-id",
    price: payload.price,
    description: payload.description,
    estimated_duration: payload.estimatedDuration ?? null,
    status: "PENDING",
    created_at: now,
    updated_at: now,
  };
}
