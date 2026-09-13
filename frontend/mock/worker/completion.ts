import { format } from "date-fns";

import { getMockAgendaEvents } from "@/mock/worker/agenda";
import type {
  CompletionHistory,
  CompletionOrder,
  CompletionPhoto,
} from "@/lib/worker/orders/types";

export const MAX_COMPLETION_PHOTOS = 10;

const MOCK_CLIENT_NAMES: Record<string, string> = {
  "mock-order-agenda-001": "Maria Silva",
  "mock-order-agenda-002": "João Pereira",
  "mock-order-agenda-003": "Ana Costa",
  "mock-order-agenda-004": "Carlos Souza",
  "mock-order-agenda-005": "Fernanda Lima",
  "mock-order-agenda-006": "Paulo Santos",
  "mock-order-agenda-007": "Juliana Alves",
};

const MOCK_PROVIDER_NAME = "Você";

function localIsoNow(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
}

function mockPhotoId(): string {
  return `mock-completion-${Date.now().toString(36)}-${Math.floor(
    Math.random() * 1_000_000,
  ).toString(36)}`;
}

// Evidências enviadas nesta sessão (ainda não confirmadas) por pedido.
const pendingPhotos = new Map<string, CompletionPhoto[]>();

// Evidências confirmadas na conclusão, por pedido.
const completedPhotos = new Map<string, CompletionPhoto[]>();

// Conclusões registradas nesta sessão por pedido.
const completionRecords = new Map<
  string,
  { completedAt: string; completedBy: string; observations: string | null }
>();

// Pedidos que devem falhar na conclusão (demonstração do Estado 7 — erro).
const failingOrders = new Set<string>();

export function setMockCompletionFailure(orderId: string, fail: boolean) {
  if (fail) {
    failingOrders.add(orderId);
  } else {
    failingOrders.delete(orderId);
  }
}

export function resetMockCompletion() {
  pendingPhotos.clear();
  completedPhotos.clear();
  completionRecords.clear();
  failingOrders.clear();
}

export function getMockCompletionOrder(
  orderId: string,
): CompletionOrder | null {
  const event = getMockAgendaEvents().find((item) => item.order_id === orderId);
  if (!event) {
    return null;
  }

  const record = completionRecords.get(orderId);
  const orderStatus =
    record || event.order_status === "COMPLETED"
      ? "COMPLETED"
      : ("IN_PROGRESS" as const);

  return {
    order_id: event.order_id,
    title: event.title,
    description: event.description,
    client_name: MOCK_CLIENT_NAMES[orderId] ?? "Cliente",
    scheduled_at: event.scheduled_at,
    scheduled_end_at: event.scheduled_end_at,
    address: event.address,
    amount: event.payment.amount,
    order_status: orderStatus,
  };
}

export function getMockPendingPhotos(orderId: string): CompletionPhoto[] {
  return [...(pendingPhotos.get(orderId) ?? [])];
}

export function mockUploadCompletionPhoto(
  orderId: string,
  previewUrl: string,
): CompletionPhoto {
  const order = getMockCompletionOrder(orderId);
  if (!order) {
    throw new Error("Serviço não encontrado.");
  }
  if (order.order_status !== "IN_PROGRESS") {
    throw new Error("Só é possível enviar fotos de serviços em andamento.");
  }

  const photos = pendingPhotos.get(orderId) ?? [];
  if (photos.length >= MAX_COMPLETION_PHOTOS) {
    throw new Error("O serviço pode ter no máximo 10 fotos.");
  }

  const photo: CompletionPhoto = {
    id: mockPhotoId(),
    url: previewUrl,
    created_at: localIsoNow(),
  };
  photos.push(photo);
  pendingPhotos.set(orderId, photos);
  return photo;
}

export function mockRemoveCompletionPhoto(
  orderId: string,
  photoId: string,
): void {
  const photos = pendingPhotos.get(orderId) ?? [];
  pendingPhotos.set(
    orderId,
    photos.filter((photo) => photo.id !== photoId),
  );
}

export function mockCompleteOrder(
  orderId: string,
  observations: string | null,
): CompletionHistory {
  const order = getMockCompletionOrder(orderId);
  if (!order) {
    throw new Error("Serviço não encontrado.");
  }
  if (order.order_status !== "IN_PROGRESS") {
    throw new Error("Este serviço já foi concluído.");
  }
  if (failingOrders.has(orderId)) {
    throw new Error(
      "Não foi possível concluir o serviço. Ocorreu um problema ao registrar a conclusão. Tente novamente.",
    );
  }

  const photos = pendingPhotos.get(orderId) ?? [];
  if (photos.length === 0) {
    throw new Error("Adicione pelo menos uma foto para concluir o serviço.");
  }

  const record = {
    completedAt: localIsoNow(),
    completedBy: MOCK_PROVIDER_NAME,
    observations,
  };
  completionRecords.set(orderId, record);
  completedPhotos.set(orderId, photos);
  pendingPhotos.delete(orderId);

  return {
    order_id: orderId,
    completed_at: record.completedAt,
    completed_by: record.completedBy,
    observations: record.observations,
    photos: photos.map((photo) => ({ id: photo.id, url: photo.url })),
  };
}

export function getMockCompletionHistory(
  orderId: string,
): CompletionHistory | null {
  const record = completionRecords.get(orderId);
  if (!record) {
    return null;
  }
  const photos = completedPhotos.get(orderId) ?? [];
  return {
    order_id: orderId,
    completed_at: record.completedAt,
    completed_by: record.completedBy,
    observations: record.observations,
    photos: photos.map((photo) => ({ id: photo.id, url: photo.url })),
  };
}

// Histórico com fallback para pedidos já COMPLETED vindos da agenda mock
// (ex.: mock-order-agenda-006), que não têm registro de conclusão em sessão.
export function getMockCompletionHistoryWithFallback(
  orderId: string,
): CompletionHistory | null {
  const history = getMockCompletionHistory(orderId);
  if (history) {
    return history;
  }
  const event = getMockAgendaEvents().find((item) => item.order_id === orderId);
  if (!event || event.order_status !== "COMPLETED") {
    return null;
  }
  return {
    order_id: orderId,
    completed_at: event.scheduled_end_at ?? event.scheduled_at,
    completed_by: MOCK_PROVIDER_NAME,
    observations: null,
    photos: event.photos.map((photo) => ({ id: photo.id, url: photo.url })),
  };
}
