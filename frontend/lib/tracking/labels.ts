// Tracking labels — contract status, timeline and formatting helpers

import type {
  ContractStatus,
  TimelineEventKey,
  TrackingAddress,
} from "@/lib/tracking/types";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export const CONTRACT_STATUS_DESCRIPTIONS: Record<ContractStatus, string> = {
  AWAITING_PAYMENT: "O pagamento ainda não foi confirmado.",
  SCHEDULED: "Pagamento confirmado. O serviço está agendado.",
  IN_PROGRESS: "O serviço foi iniciado e está em execução.",
  COMPLETED: "O serviço foi concluído.",
  CANCELLED: "Esta contratação foi cancelada.",
};

export const TIMELINE_EVENT_LABELS: Record<TimelineEventKey, string> = {
  REQUEST_SENT: "Solicitação enviada",
  PROPOSAL_SENT: "Proposta enviada",
  PROPOSAL_ACCEPTED: "Proposta aceita",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  SERVICE_SCHEDULED: "Serviço agendado",
  SERVICE_STARTED: "Serviço em andamento",
  SERVICE_COMPLETED: "Serviço concluído",
  EVIDENCES_ADDED: "Evidências adicionadas",
  REVIEW_SUBMITTED: "Avaliação realizada",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Confirmado",
  FAILED: "Falhou",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

export function getContractStatusLabel(status: ContractStatus): string {
  return CONTRACT_STATUS_LABELS[status];
}

export function getTimelineEventLabel(key: TimelineEventKey): string {
  return TIMELINE_EVENT_LABELS[key];
}

export function getPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function formatTrackingAmount(value: number | null): string {
  if (value == null) {
    return "A combinar";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatTrackingDateTime(iso: string | null): string {
  if (!iso) {
    return "Data indisponível";
  }
  const date = new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const time = new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} às ${time}`;
}

export function formatTrackingAddress(address: TrackingAddress): string {
  const parts = [
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state,
  ].filter((part): part is string => !!part && part.trim().length > 0);
  if (parts.length === 0) {
    return "Local a combinar";
  }
  return parts.join(", ");
}

export function buildMapsLink(address: TrackingAddress): string | null {
  const query = formatTrackingAddress(address);
  if (query === "Local a combinar") {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
