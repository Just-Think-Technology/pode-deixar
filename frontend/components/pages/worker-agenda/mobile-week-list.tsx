"use client";

import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  formatAgendaTimeRange,
  getAgendaStatusLabel,
} from "@/lib/worker/agenda/labels";
import type { WorkerAgendaEvent } from "@/lib/worker/agenda/types";
import { cn } from "@/lib/utils";

type AgendaMobileWeekListProps = {
  weekAnchor: Date;
  events: WorkerAgendaEvent[];
  onSelectEvent: (event: WorkerAgendaEvent) => void;
};

export function AgendaMobileWeekList({
  weekAnchor,
  events,
  onSelectEvent,
}: AgendaMobileWeekListProps) {
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const hasAny = events.some((event) =>
    days.some((day) => isSameDay(new Date(event.scheduled_at), day)),
  );

  if (!hasAny) {
    return (
      <Empty className="border border-dashed md:hidden">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Calendar />
          </EmptyMedia>
          <EmptyTitle>Nenhum serviço agendado neste período</EmptyTitle>
          <EmptyDescription>
            Não há serviços pagos nesta semana. Navegue pelo calendário para ver
            o passado ou o futuro.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6 md:hidden" data-slot="agenda-mobile-week-list">
      {days.map((day) => {
        const dayEvents = events
          .filter((event) => isSameDay(new Date(event.scheduled_at), day))
          .sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime(),
          );
        if (dayEvents.length === 0) {
          return null;
        }
        return (
          <section key={day.toISOString()}>
            <h3 className="mb-2 text-sm font-medium capitalize text-foreground">
              {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h3>
            <ul className="space-y-3">
              {dayEvents.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => onSelectEvent(event)}
                  >
                    <Card className="transition-colors hover:bg-muted/40">
                      <CardContent className="flex items-start gap-3 px-4">
                        <span
                          className={cn(
                            "mt-1 size-2.5 shrink-0 rounded-full",
                            event.order_status === "COMPLETED"
                              ? "bg-[#27AE60]"
                              : "bg-[#2F80ED]",
                          )}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="truncate font-medium">
                              {event.title}
                            </p>
                            <Badge variant="outline">
                              {getAgendaStatusLabel(event.order_status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatAgendaTimeRange(
                              event.scheduled_at,
                              event.scheduled_end_at,
                            )}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
