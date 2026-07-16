import type { ProposalStatus } from "@/lib/client/orders/types";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
  WITHDRAWN: "Retirada",
};

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function getProposalStatusLabel(status: string): string {
  return (
    PROPOSAL_STATUS_LABELS[status as ProposalStatus] ?? status
  );
}

export function formatOrderBudget(
  min: number | null,
  max: number | null,
): string {
  const format = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (min != null && max != null) {
    return `${format(min)} – ${format(max)}`;
  }
  if (min != null) return `A partir de ${format(min)}`;
  if (max != null) return `Até ${format(max)}`;
  return "Orçamento a combinar";
}

export function formatOrderDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatProposalPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function isPendingProposal(status: string): boolean {
  return status === "PENDING";
}
