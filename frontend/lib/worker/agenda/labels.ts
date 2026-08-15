import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export function formatAgendaAddress(address: WorkerAgendaAddress): string {
  return `${address.street}, ${address.number} — ${address.neighborhood}, ${address.city} - ${address.state}, ${address.postal_code}`;
}

export function getGoogleMapsUrl(address: WorkerAgendaAddress): string {
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
