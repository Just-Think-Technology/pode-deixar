import type {
  ClientOrder,
  ClientProposal,
} from "@/lib/client/orders/types";

export const MOCK_CLIENT_ORDERS: ClientOrder[] = [
  {
    id: "mock-client-order-001",
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
    proposals: [
      {
        id: "mock-client-proposal-001",
        provider_id: "mock-provider-id",
        price: 180,
        description:
          "Posso realizar o reparo ainda esta semana, com garantia de 90 dias.",
        estimated_duration: "2 horas",
        status: "PENDING",
        created_at: "2026-07-11T09:00:00.000Z",
      },
      {
        id: "mock-client-proposal-002",
        provider_id: "mock-provider-id-2",
        price: 220,
        description:
          "Atendimento no mesmo dia, incluindo troca da vedação e teste de pressão.",
        estimated_duration: "1 hora e 30 minutos",
        status: "PENDING",
        created_at: "2026-07-11T14:00:00.000Z",
      },
    ],
  },
  {
    id: "mock-client-order-002",
    client_id: "mock-client-id",
    provider_id: null,
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
    id: "mock-client-order-003",
    client_id: "mock-client-id",
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
    proposals: [
      {
        id: "mock-client-proposal-003",
        provider_id: "mock-provider-id",
        price: 380,
        description:
          "Inclui lixamento, fundo e duas demãos na cor escolhida pelo cliente.",
        estimated_duration: "1 dia",
        status: "ACCEPTED",
        created_at: "2026-07-02T10:00:00.000Z",
      },
    ],
  },
];

function cloneOrders(): ClientOrder[] {
  return structuredClone(MOCK_CLIENT_ORDERS);
}

type MockOrdersGlobal = typeof globalThis & {
  __podeDeixarMockClientOrders?: ClientOrder[];
};

function getRuntimeOrders(): ClientOrder[] {
  const g = globalThis as MockOrdersGlobal;
  if (!g.__podeDeixarMockClientOrders) {
    g.__podeDeixarMockClientOrders = cloneOrders();
  }
  return g.__podeDeixarMockClientOrders;
}

export function resetMockClientOrders() {
  const g = globalThis as MockOrdersGlobal;
  g.__podeDeixarMockClientOrders = cloneOrders();
}

export function getMockClientOrders(): ClientOrder[] {
  // Mantém proposals no mock para a lista poder exibir contagem;
  // a API real pode omitir o campo — a UI trata como opcional.
  return structuredClone(getRuntimeOrders());
}

export function appendMockClientOrder(order: ClientOrder): void {
  getRuntimeOrders().unshift(structuredClone(order));
}

export function getMockClientOrderById(id: string): ClientOrder | null {
  const order = getRuntimeOrders().find((item) => item.id === id);
  return order ? structuredClone(order) : null;
}

function findProposal(
  proposalId: string,
): { order: ClientOrder; proposalIndex: number } | null {
  for (const order of getRuntimeOrders()) {
    const proposalIndex =
      order.proposals?.findIndex((proposal) => proposal.id === proposalId) ??
      -1;
    if (proposalIndex >= 0) {
      return { order, proposalIndex };
    }
  }
  return null;
}

function toClientProposal(
  orderId: string,
  proposal: NonNullable<ClientOrder["proposals"]>[number],
  status: string,
): ClientProposal {
  const now = new Date().toISOString();
  return {
    id: proposal.id,
    service_order_id: orderId,
    provider_id: proposal.provider_id,
    price: proposal.price,
    description: proposal.description,
    estimated_duration: proposal.estimated_duration,
    status,
    created_at: proposal.created_at,
    updated_at: now,
  };
}

export function mockAcceptProposal(proposalId: string): ClientProposal {
  const found = findProposal(proposalId);
  if (!found) {
    throw new Error("Proposta não encontrada");
  }

  const { order, proposalIndex } = found;
  const proposal = order.proposals![proposalIndex];

  if (order.status !== "OPEN") {
    throw new Error("O pedido não está mais aberto");
  }
  if (proposal.status !== "PENDING") {
    throw new Error("Proposta não está mais pendente");
  }

  proposal.status = "ACCEPTED";
  for (const other of order.proposals ?? []) {
    if (other.id !== proposalId && other.status === "PENDING") {
      other.status = "REJECTED";
    }
  }
  order.status = "IN_PROGRESS";
  order.updated_at = new Date().toISOString();

  return toClientProposal(order.id, proposal, "ACCEPTED");
}

export function mockRejectProposal(proposalId: string): ClientProposal {
  const found = findProposal(proposalId);
  if (!found) {
    throw new Error("Proposta não encontrada");
  }

  const { order, proposalIndex } = found;
  const proposal = order.proposals![proposalIndex];

  if (proposal.status !== "PENDING") {
    throw new Error("Proposta não está mais pendente");
  }

  proposal.status = "REJECTED";
  order.updated_at = new Date().toISOString();

  return toClientProposal(order.id, proposal, "REJECTED");
}
