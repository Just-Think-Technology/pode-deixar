import type { ServiceOrderStatus } from "@/lib/worker/requests/types";

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export function getRequestStatusLabel(status: string): string {
  return REQUEST_STATUS_LABELS[status] ?? status;
}

export function formatRequestBudget(
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

export function formatRequestDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function isOpenRequest(status: ServiceOrderStatus | string): boolean {
  return status === "OPEN";
}
