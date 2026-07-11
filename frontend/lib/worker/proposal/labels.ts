import type { ProposalStatus } from "@/lib/worker/proposal/types";

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
  WITHDRAWN: "Retirada",
};

export function formatProposalPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatProposalDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
