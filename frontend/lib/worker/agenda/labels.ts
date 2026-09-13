// Worker agenda labels — date and status display strings

import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ApiError } from "@/api/client";
import type {
  WorkerAgendaAddress,
  WorkerAgendaEvent,
  WorkerAgendaOrderStatus,
  WorkerAgendaRange,
} from "@/lib/worker/agenda/types";

export const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

export const AGENDA_STATUS_LABELS: Record<WorkerAgendaOrderStatus, string> = {
  IN_PROGRESS: "A realizar",
  COMPLETED: "Realizado",
};

export function getAgendaEventsErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return "Você não tem permissão para acessar a agenda.";
    }
    if (err.status === 400) {
      return typeof err.message === "string"
        ? err.message
        : "Período de consulta inválido.";
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Não foi possível carregar a agenda.";
}

export function getAgendaStatusLabel(status: WorkerAgendaOrderStatus): string {
  return AGENDA_STATUS_LABELS[status];
}

export function getAgendaRangeForMonth(month: Date): WorkerAgendaRange {
  const from = startOfMonth(addMonths(month, -1));
  const to = endOfMonth(addMonths(month, 1));
  return {
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
  };
}

function addressPart(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hasAgendaAddress(address: WorkerAgendaAddress | null): boolean {
  if (!address) {
    return false;
  }
  return (
    addressPart(address.street) != null &&
    addressPart(address.number) != null &&
    addressPart(address.city) != null &&
    addressPart(address.state) != null
  );
}

export function formatAgendaAddress(address: WorkerAgendaAddress): string {
  const street = addressPart(address.street);
  const number = addressPart(address.number);
  const neighborhood = addressPart(address.neighborhood);
  const city = addressPart(address.city);
  const state = addressPart(address.state);
  const postalCode = addressPart(address.postal_code);

  const line1 =
    street && number ? `${street}, ${number}` : street ?? number ?? null;
  const line2Parts = [neighborhood, city, state].filter(Boolean);
  const line2 =
    line2Parts.length > 0
      ? `${line2Parts.join(", ")}${postalCode ? `, ${postalCode}` : ""}`
      : postalCode;

  return [line1, line2].filter(Boolean).join(" — ") || "Endereço não informado";
}

export function getGoogleMapsUrl(address: WorkerAgendaAddress): string | null {
  if (!hasAgendaAddress(address)) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    formatAgendaAddress(address),
  )}`;
}

export function formatAgendaDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatAgendaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAgendaTimeRange(
  startIso: string,
  endIso: string | null,
): string {
  const startTime = formatAgendaTime(startIso);
  if (!endIso) {
    return startTime;
  }
  return `${startTime} – ${formatAgendaTime(endIso)}`;
}

export function formatWeekRangeLabel(weekStart: Date, weekEnd: Date): string {
  return `${format(weekStart, "d", { locale: ptBR })} – ${format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
}

export function formatDayHeading(date: Date): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function getEventEndDate(event: WorkerAgendaEvent): Date {
  if (event.scheduled_end_at) {
    return new Date(event.scheduled_end_at);
  }
  return new Date(
    new Date(event.scheduled_at).getTime() + DEFAULT_EVENT_DURATION_MS,
  );
}

export function parseAgendaDayParam(
  value: string | undefined,
): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}
