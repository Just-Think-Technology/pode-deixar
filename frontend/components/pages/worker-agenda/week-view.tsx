"use client";

import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatAgendaTime,
  formatWeekRangeLabel,
  getAgendaStatusLabel,
  getEventEndDate,
} from "@/lib/worker/agenda/labels";
import type { WorkerAgendaEvent } from "@/lib/worker/agenda/types";
import { cn } from "@/lib/utils";

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 56;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, index) => START_HOUR + index,
);

type AgendaWeekViewProps = {
  weekAnchor: Date;
  events: WorkerAgendaEvent[];
  onSelectEvent: (event: WorkerAgendaEvent) => void;
  onWeekChange: (nextAnchor: Date) => void;
  onToday: () => void;
};

function eventsForDay(events: WorkerAgendaEvent[], day: Date) {
  return events.filter((event) => isSameDay(new Date(event.scheduled_at), day));
}

function eventPosition(event: WorkerAgendaEvent) {
  const start = new Date(event.scheduled_at);
  const end = getEventEndDate(event);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 28);
  return { top, height };
}

export function AgendaWeekView({
  weekAnchor,
  events,
  onSelectEvent,
  onWeekChange,
  onToday,
}: AgendaWeekViewProps) {
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const today = new Date();

  return (
    <section
      data-slot="agenda-week-view"
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-medium capitalize text-foreground">
            {formatWeekRangeLabel(weekStart, weekEnd)}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Semana anterior"
              onClick={() => onWeekChange(addDays(weekStart, -7))}
            >
              <ChevronLeft />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onToday}>
              Hoje
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Próxima semana"
              onClick={() => onWeekChange(addDays(weekStart, 7))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b bg-muted/40">
          <div />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-l px-1 py-2 text-center",
                  isToday && "bg-[#2F80ED]/8",
                )}
              >
                <p className="text-[0.7rem] font-medium uppercase text-muted-foreground">
                  {format(day, "EEE", { locale: ptBR })}
                </p>
                <p
                  className={cn(
                    "mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm",
                    isToday
                      ? "bg-[#2F80ED] font-semibold text-white"
                      : "text-foreground",
                  )}
                >
                  {format(day, "d")}
                </p>
              </div>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div
            className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]"
            style={{ height: HOURS.length * HOUR_HEIGHT }}
          >
            <div className="relative">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-1 -translate-y-1/2 text-[0.65rem] text-muted-foreground"
                  style={{
                    top: (hour - START_HOUR) * HOUR_HEIGHT,
                  }}
                >
                  {`${String(hour).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>

            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative border-l",
                  isSameDay(day, today) && "bg-[#2F80ED]/4",
                )}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-t border-border/70"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}
                {eventsForDay(events, day).map((event) => {
                  const { top, height } = eventPosition(event);
                  const isCompleted = event.order_status === "COMPLETED";
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      aria-label={`${event.title}, ${formatAgendaTime(event.scheduled_at)}, ${getAgendaStatusLabel(event.order_status)}`}
                      className={cn(
                        "absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-left text-xs shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
                        isCompleted
                          ? "bg-[#27AE60] text-white"
                          : "bg-[#2F80ED] text-white",
                      )}
                      style={{ top, height }}
                    >
                      <span className="block truncate font-medium">
                        {event.title}
                      </span>
                      <span className="block truncate opacity-90">
                        {formatAgendaTime(event.scheduled_at)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
