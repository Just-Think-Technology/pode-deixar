// Tracking mocks — curated scenarios plus live client orders and agenda events

import { format } from "date-fns";

import { deriveContractStatus } from "@/lib/tracking/timeline-builder";
import type {
  ClientOrder,
  ClientOrderProposal,
} from "@/lib/client/orders/types";
import type {
  ContractTracking,
  SubmitReviewInput,
  TrackingReview,
  TrackingRole,
} from "@/lib/tracking/types";
import type { WorkerAgendaEvent } from "@/lib/worker/agenda/types";
import { getMockClientOrderById } from "@/mock/client/orders";
import { mockFindPaymentsByOrder } from "@/mock/client/payments";
import { getMockAgendaEvents } from "@/mock/worker/agenda";
import {
  getMockCompletionHistoryWithFallback,
  MOCK_CLIENT_NAMES,
} from "@/mock/worker/completion";

export const TRACKING_ORDER_IDS = {
  awaitingPayment: "tracking-awaiting-payment",
  scheduled: "tracking-scheduled",
  inProgress: "tracking-in-progress",
  completed: "tracking-completed",
  cancelled: "tracking-cancelled",
} as const;

// Fallback fee rate matching the backend default (PLATFORM_FEE_RATE=0.10).
const MOCK_FEE_RATE = 0.1;

const CLIENT = { id: "mock-client-ana", completeName: "Ana Costa" };
const PROVIDER = { id: "mock-provider-voce", completeName: "Carlos Silva" };

function localIsoNow(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
}

function isoDaysFromNow(days: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

function placeholderPhoto(id: string, label: string): { id: string; url: string } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="#27AE60" width="800" height="600"/><text x="50%" y="50%" fill="#ffffff" font-family="sans-serif" font-size="32" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return {
    id,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}

function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function splitAmounts(gross: number | null): {
  grossAmount: number | null;
  feeAmount: number | null;
  netAmount: number | null;
} {
  if (gross == null) {
    return { grossAmount: null, feeAmount: null, netAmount: null };
  }
  const feeAmount = toMoney(gross * MOCK_FEE_RATE);
  return { grossAmount: gross, feeAmount, netAmount: toMoney(gross - feeAmount) };
}

function addressField(address: Record<string, unknown>, key: string): string | null {
  const value = address[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

// --- Section ---

type SeedInput = {
  orderId: string;
  orderStatus: ContractTracking["orderStatus"];
  payment: ContractTracking["payment"];
  scheduledAt: string | null;
  scheduledEndAt: string | null;
  startedAt: string | null;
  evidence: ContractTracking["evidence"];
  review: ContractTracking["review"];
  cancelReason: string | null;
  cancelledAt: string | null;
  title: string;
  description: string;
};

function buildSeed(input: SeedInput, role: TrackingRole): ContractTracking {
  const counterpart =
    role === "CLIENT"
      ? { id: PROVIDER.id, completeName: PROVIDER.completeName, avatarUrl: null }
      : { id: CLIENT.id, completeName: CLIENT.completeName, avatarUrl: null };

  return {
    orderId: input.orderId,
    title: input.title,
    description: input.description,
    categoryName: "Hidráulica",
    orderStatus: input.orderStatus,
    role,
    counterpart,
    scheduledAt: input.scheduledAt,
    scheduledEndAt: input.scheduledEndAt,
    startedAt: input.startedAt,
    address: {
      street: "Rua Augusta",
      number: "500",
      neighborhood: "Consolação",
      city: "São Paulo",
      state: "SP",
      postal_code: "01305-000",
    },
    ...splitAmounts(180),
    proposal: {
      id: `proposal-${input.orderId}`,
      providerId: PROVIDER.id,
      price: 180,
      description: "Posso realizar o serviço ainda esta semana.",
      estimatedDuration: "2 horas",
      acceptedAt: isoDaysFromNow(-4, 15, 30),
    },
    payment: input.payment,
    evidence: input.evidence,
    review: input.review,
    cancelReason: input.cancelReason,
    cancelledAt: input.cancelledAt,
    createdAt: isoDaysFromNow(-5, 10, 0),
  };
}

function seedFor(orderId: string): SeedInput | null {
  switch (orderId) {
    case TRACKING_ORDER_IDS.awaitingPayment:
      return {
        orderId,
        orderStatus: "IN_PROGRESS",
        payment: { id: "payment-awaiting", status: "PENDING", method: "PIX", amount: 180, paidAt: null },
        scheduledAt: isoDaysFromNow(2, 14, 0),
        scheduledEndAt: isoDaysFromNow(2, 16, 0),
        startedAt: null,
        evidence: null,
        review: null,
        cancelReason: null,
        cancelledAt: null,
        title: "Troca da torneira da cozinha",
        description: "Troca da torneira da pia e verificação de vazamentos na conexão.",
      };
    case TRACKING_ORDER_IDS.scheduled:
      return {
        orderId,
        orderStatus: "IN_PROGRESS",
        payment: { id: "payment-scheduled", status: "PAID", method: "PIX", amount: 180, paidAt: isoDaysFromNow(-1, 18, 5) },
        scheduledAt: isoDaysFromNow(2, 9, 0),
        scheduledEndAt: isoDaysFromNow(2, 11, 0),
        startedAt: null,
        evidence: null,
        review: null,
        cancelReason: null,
        cancelledAt: null,
        title: "Instalação de chuveiro elétrico",
        description: "Instalação completa do chuveiro com revisão da fiação.",
      };
    case TRACKING_ORDER_IDS.inProgress:
      return {
        orderId,
        orderStatus: "IN_PROGRESS",
        payment: { id: "payment-progress", status: "PAID", method: "PIX", amount: 250, paidAt: isoDaysFromNow(-2, 9, 15) },
        scheduledAt: isoDaysFromNow(0, 8, 0),
        scheduledEndAt: isoDaysFromNow(0, 12, 0),
        startedAt: isoDaysFromNow(0, 8, 5),
        evidence: null,
        review: null,
        cancelReason: null,
        cancelledAt: null,
        title: "Reparo no quadro elétrico",
        description: "Substituição de disjuntor e revisão das tomadas da sala.",
      };
    case TRACKING_ORDER_IDS.completed:
      return {
        orderId,
        orderStatus: "COMPLETED",
        payment: { id: "payment-completed", status: "PAID", method: "PIX", amount: 420, paidAt: isoDaysFromNow(-6, 12, 40) },
        scheduledAt: isoDaysFromNow(-3, 10, 0),
        scheduledEndAt: isoDaysFromNow(-3, 12, 0),
        startedAt: isoDaysFromNow(-3, 10, 2),
        evidence: {
          completedAt: isoDaysFromNow(-3, 11, 45),
          completedBy: PROVIDER.completeName,
          observations: "Pintura concluída com duas demãos e limpeza do local.",
          photos: [
            placeholderPhoto("tracking-photo-001", "Parede 1"),
            placeholderPhoto("tracking-photo-002", "Parede 2"),
          ],
        },
        review: null,
        cancelReason: null,
        cancelledAt: null,
        title: "Pintura de duas paredes",
        description: "Pintura de duas paredes do quarto com tinta acrílica branca.",
      };
    case TRACKING_ORDER_IDS.cancelled:
      return {
        orderId,
        orderStatus: "CANCELLED",
        payment: { id: "payment-cancelled", status: "CANCELLED", method: "PIX", amount: 180, paidAt: null },
        scheduledAt: isoDaysFromNow(4, 10, 0),
        scheduledEndAt: isoDaysFromNow(4, 12, 0),
        startedAt: null,
        evidence: null,
        review: null,
        cancelReason: "Cliente solicitou o cancelamento antes do pagamento.",
        cancelledAt: isoDaysFromNow(-1, 16, 20),
        title: "Desentupimento da pia",
        description: "Desentupimento da pia da cozinha com equipamento apropriado.",
      };
    default:
      return null;
  }
}

// --- Section ---

function toOrderStatus(status: string): ContractTracking["orderStatus"] {
  if (status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED") {
    return status;
  }
  return "OPEN";
}

// Static complements for seeded orders whose backend-shaped fields live
// outside the order mock (scheduling, payment record, completion evidence).
// Session stores (payments, finishes, reviews) take precedence when present.
type ClientOrderExtras = {
  scheduledAt: string;
  scheduledEndAt: string;
  startedAt: string;
  payment: ContractTracking["payment"];
  evidence: ContractTracking["evidence"];
};

const CLIENT_ORDER_EXTRAS: Record<string, ClientOrderExtras> = {
  "mock-client-order-004": {
    scheduledAt: "2026-06-14T09:00:00.000Z",
    scheduledEndAt: "2026-06-14T12:00:00.000Z",
    startedAt: "2026-06-14T09:05:00.000Z",
    payment: {
      id: "mock-payment-order-004",
      status: "PAID",
      method: "PIX",
      amount: 280,
      paidAt: "2026-06-12T18:20:00.000Z",
    },
    evidence: {
      completedAt: "2026-06-14T11:40:00.000Z",
      completedBy: "Prestador",
      observations: "Caixa limpa e higienizada, tampa vedada corretamente.",
      photos: [
        placeholderPhoto("tracking-order-004-photo-001", "Antes"),
        placeholderPhoto("tracking-order-004-photo-002", "Depois"),
      ],
    },
  },
};

function toTrackingProposal(  proposal: ClientOrderProposal,
  accepted: boolean,
): ContractTracking["proposal"] {
  return {
    id: proposal.id,
    providerId: proposal.provider_id,
    price: proposal.price,
    description: proposal.description,
    estimatedDuration: proposal.estimated_duration,
    acceptedAt: accepted ? proposal.created_at : null,
  };
}

function fromClientOrder(order: ClientOrder, role: TrackingRole): ContractTracking {
  const proposals = order.proposals ?? [];
  const accepted = proposals.find((item) => item.status === "ACCEPTED") ?? null;
  const reference = accepted ?? proposals[0] ?? null;
  const payments = mockFindPaymentsByOrder(order.id);
  const latestPayment = payments[0] ?? null;
  const extras = CLIENT_ORDER_EXTRAS[order.id] ?? null;
  const gross = reference?.price ?? order.budget_max ?? order.budget_min ?? null;
  const counterpart =
    role === "CLIENT"
      ? { id: order.provider_id ?? "mock-provider-id", completeName: "Prestador", avatarUrl: null }
      : { id: order.client_id, completeName: "Cliente", avatarUrl: null };

  return {
    orderId: order.id,
    title: order.title,
    description: order.description,
    categoryName: order.category?.name ?? null,
    orderStatus: toOrderStatus(order.status),
    role,
    counterpart,
    scheduledAt: extras?.scheduledAt ?? null,
    scheduledEndAt: extras?.scheduledEndAt ?? null,
    startedAt: extras?.startedAt ?? null,
    address: {
      street: addressField(order.address, "street"),
      number: addressField(order.address, "number"),
      neighborhood: addressField(order.address, "neighborhood"),
      city: addressField(order.address, "city"),
      state: addressField(order.address, "state"),
      postal_code: addressField(order.address, "postal_code"),
    },
    ...splitAmounts(gross),
    proposal: reference ? toTrackingProposal(reference, accepted != null) : null,
    payment: latestPayment
      ? {
          id: latestPayment.id,
          status: latestPayment.status,
          method: latestPayment.method,
          amount: latestPayment.amount,
          paidAt: latestPayment.paidAt,
        }
      : (extras?.payment ?? { id: null, status: "PENDING", method: null, amount: null, paidAt: null }),
    evidence: extras?.evidence ?? null,
    review: null,
    cancelReason: null,
    cancelledAt: null,
    createdAt: order.created_at,
  };
}

function fromAgendaEvent(event: WorkerAgendaEvent, role: TrackingRole): ContractTracking {
  const clientName = MOCK_CLIENT_NAMES[event.order_id] ?? "Cliente";
  const counterpart =
    role === "PROVIDER"
      ? { id: `client-${event.order_id}`, completeName: clientName, avatarUrl: null }
      : { id: "mock-provider-id", completeName: "Prestador", avatarUrl: null };
  const completed = event.order_status === "COMPLETED";
  const completedAt = event.scheduled_end_at ?? event.scheduled_at;

  return {
    orderId: event.order_id,
    title: event.title,
    description: event.description,
    categoryName: null,
    orderStatus: event.order_status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
    role,
    counterpart,
    scheduledAt: event.scheduled_at,
    scheduledEndAt: event.scheduled_end_at,
    startedAt: null,
    address: { ...event.address },
    ...splitAmounts(event.payment.amount),
    proposal: null,
    payment: {
      id: `payment-${event.order_id}`,
      status: "PAID",
      method: "PIX",
      amount: event.payment.amount,
      paidAt: event.payment.paid_at,
    },
    evidence: completed
      ? {
          completedAt,
          completedBy: role === "PROVIDER" ? "Você" : counterpart.completeName,
          observations: null,
          photos: event.photos.map((photo) => ({ id: photo.id, url: photo.url })),
        }
      : null,
    review: null,
    cancelReason: null,
    cancelledAt: null,
    createdAt: event.payment.paid_at,
  };
}

// --- Section ---

const startedOrders = new Map<string, string>();
const finishedOrders = new Map<string, ContractTracking["evidence"]>();
const submittedReviews = new Map<string, TrackingReview>();

export function resetMockTracking(): void {
  startedOrders.clear();
  finishedOrders.clear();
  submittedReviews.clear();
}

export function getMockTrackingIds(): string[] {
  return Object.values(TRACKING_ORDER_IDS);
}

export function getMockContractTracking(
  orderId: string,
  role: TrackingRole,
): ContractTracking | null {
  const seed = seedFor(orderId);
  const clientOrder = seed ? null : getMockClientOrderById(orderId);
  const agendaEvent =
    seed || clientOrder
      ? null
      : (getMockAgendaEvents().find((item) => item.order_id === orderId) ?? null);

  const tracking = seed
    ? buildSeed(seed, role)
    : clientOrder
      ? fromClientOrder(clientOrder, role)
      : agendaEvent
        ? fromAgendaEvent(agendaEvent, role)
        : null;

  if (!tracking) {
    return null;
  }

  if (tracking.orderStatus === "IN_PROGRESS") {
    const startedAt = startedOrders.get(orderId);
    if (startedAt) {
      tracking.startedAt = startedAt;
    }
  }

  const evidence = finishedOrders.get(orderId);
  if (evidence) {
    tracking.orderStatus = "COMPLETED";
    tracking.startedAt = tracking.startedAt ?? evidence.completedAt;
    tracking.evidence = evidence;
  }

  // Completion registered through the finish screen shares its store here,
  // so evidences show up on tracking without duplicating uploads.
  if (!tracking.evidence && tracking.orderStatus !== "CANCELLED") {
    const history = getMockCompletionHistoryWithFallback(orderId);
    if (history) {
      tracking.orderStatus = "COMPLETED";
      tracking.startedAt = tracking.startedAt ?? history.completed_at;
      tracking.evidence = {
        completedAt: history.completed_at,
        completedBy: history.completed_by,
        observations: history.observations,
        photos: history.photos.map((photo) => ({ id: photo.id, url: photo.url })),
      };
    }
  }

  const review = submittedReviews.get(orderId);
  if (review) {
    tracking.review = review;
  }

  return tracking;
}

export function mockStartService(orderId: string): ContractTracking {
  const tracking = getMockContractTracking(orderId, "PROVIDER");
  if (!tracking) {
    throw new Error("Contratação não encontrada.");
  }
  const status = deriveContractStatus(tracking);
  if (status === "COMPLETED") {
    throw new Error("Este serviço já foi concluído.");
  }
  if (status === "CANCELLED") {
    throw new Error("Esta contratação foi cancelada.");
  }
  if (status === "AWAITING_PAYMENT") {
    throw new Error("O serviço só pode começar após a confirmação do pagamento.");
  }
  if (status === "IN_PROGRESS") {
    throw new Error("Este serviço já está em andamento.");
  }
  startedOrders.set(orderId, localIsoNow());
  const started = getMockContractTracking(orderId, "PROVIDER");
  if (!started) {
    throw new Error("Contratação não encontrada.");
  }
  return started;
}

export function mockFinishService(
  orderId: string,
  photoCount: number,
  observations: string | null,
): ContractTracking {
  const tracking = getMockContractTracking(orderId, "PROVIDER");
  if (!tracking) {
    throw new Error("Contratação não encontrada.");
  }
  const status = deriveContractStatus(tracking);
  if (status === "COMPLETED") {
    throw new Error("Este serviço já foi concluído.");
  }
  if (status === "CANCELLED") {
    throw new Error("Esta contratação foi cancelada.");
  }
  if (status === "AWAITING_PAYMENT") {
    throw new Error("O serviço só pode ser concluído após a confirmação do pagamento.");
  }
  if (status === "SCHEDULED") {
    throw new Error("Inicie o serviço antes de concluí-lo.");
  }
  if (photoCount < 1) {
    throw new Error("Adicione pelo menos uma foto para concluir o serviço.");
  }
  const evidence: ContractTracking["evidence"] = {
    completedAt: localIsoNow(),
    completedBy: PROVIDER.completeName,
    observations,
    photos: [placeholderPhoto(`tracking-finish-${orderId}`, "Evidência")],
  };
  finishedOrders.set(orderId, evidence);
  const finished = getMockContractTracking(orderId, "PROVIDER");
  if (!finished) {
    throw new Error("Contratação não encontrada.");
  }
  return finished;
}

export function mockSubmitReview(
  orderId: string,
  input: SubmitReviewInput,
): TrackingReview {
  const tracking = getMockContractTracking(orderId, "CLIENT");
  if (!tracking) {
    throw new Error("Contratação não encontrada.");
  }
  if (deriveContractStatus(tracking) !== "COMPLETED") {
    throw new Error("A avaliação só é liberada após a conclusão do serviço.");
  }
  if (submittedReviews.has(orderId) || tracking.review != null) {
    throw new Error("Esta contratação já foi avaliada.");
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("A nota deve ser um número de 1 a 5.");
  }
  const comment = input.comment?.trim() ? input.comment.trim() : null;
  if (comment != null && comment.length > 500) {
    throw new Error("O comentário deve ter no máximo 500 caracteres.");
  }
  const review: TrackingReview = {
    id: `review-${orderId}`,
    rating: input.rating,
    comment,
    createdAt: localIsoNow(),
  };
  submittedReviews.set(orderId, review);
  return review;
}
