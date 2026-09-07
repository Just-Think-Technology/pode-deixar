"use client";

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
  formatDayHeading,
  getAgendaStatusLabel,
} from "@/lib/worker/agenda/labels";
import type { WorkerAgendaEvent } from "@/lib/worker/agenda/types";
import { cn } from "@/lib/utils";

type AgendaDayListProps = {
  date: Date;
  events: WorkerAgendaEvent[];
  onSelectEvent: (event: WorkerAgendaEvent) => void;
};

export function AgendaDayList({
  date,
  events,
  onSelectEvent,
}: AgendaDayListProps) {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );

  return (
    <section
      data-slot="agenda-day-list"
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <h2 className="mb-4 shrink-0 text-sm font-medium capitalize text-foreground">
        {formatDayHeading(date)}
      </h2>

      {sorted.length === 0 ? (
        <Empty className="min-h-0 flex-1 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Calendar />
            </EmptyMedia>
            <EmptyTitle>Nenhum serviço agendado neste período</EmptyTitle>
            <EmptyDescription>
              Não há serviços pagos neste dia. Selecione outro dia no calendário
              ou clique novamente para voltar à semana.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          {sorted.map((event) => {
            const isCompleted = event.order_status === "COMPLETED";
            return (
              <li key={event.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelectEvent(event)}
                  aria-label={`${event.title}, ${formatAgendaTimeRange(event.scheduled_at, event.scheduled_end_at)}`}
                >
                  <Card className="transition-colors hover:bg-muted/40">
                    <CardContent className="flex items-start gap-3 px-4">
                      <span
                        className={cn(
                          "mt-1 size-2.5 shrink-0 rounded-full",
                          isCompleted ? "bg-[#27AE60]" : "bg-[#2F80ED]",
                        )}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="truncate font-medium text-foreground">
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
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
