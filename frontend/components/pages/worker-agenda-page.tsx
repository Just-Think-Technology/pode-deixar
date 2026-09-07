"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { AgendaDayList } from "@/components/pages/worker-agenda/day-list";
import { AgendaEventDetailDialog } from "@/components/pages/worker-agenda/event-detail-dialog";
import { AgendaMiniCalendar } from "@/components/pages/worker-agenda/mini-calendar";
import { AgendaMobileWeekList } from "@/components/pages/worker-agenda/mobile-week-list";
import { AgendaWeekView } from "@/components/pages/worker-agenda/week-view";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getAgendaEventsAction } from "@/lib/worker/agenda/actions";
import {
  getAgendaEventsErrorMessage,
  getAgendaRangeForMonth,
  parseAgendaDayParam,
} from "@/lib/worker/agenda/labels";
import type { WorkerAgendaEvent } from "@/lib/worker/agenda/types";

type WorkerAgendaPageProps = {
  events: WorkerAgendaEvent[];
  initialDay?: string;
  initialLoadError?: string;
};

export default function WorkerAgendaPage({
  events: initialEvents,
  initialDay,
  initialLoadError,
}: WorkerAgendaPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [events, setEvents] = useState(initialEvents);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(() =>
    parseAgendaDayParam(initialDay),
  );
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDay ?? new Date(),
  );
  const [weekAnchor, setWeekAnchor] = useState(() => selectedDay ?? new Date());
  const [selectedEvent, setSelectedEvent] = useState<WorkerAgendaEvent | null>(
    null,
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | undefined>(
    initialLoadError,
  );

  async function reloadAgenda(month: Date) {
    try {
      const nextEvents = await getAgendaEventsAction(
        getAgendaRangeForMonth(month),
      );
      setEvents(nextEvents);
      setLoadError(undefined);
    } catch (err) {
      const message = getAgendaEventsErrorMessage(err);
      setLoadError(message);
      toast.error(message);
    }
  }

  const daysWithEvents = useMemo(
    () => events.map((event) => new Date(event.scheduled_at)),
    [events],
  );

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) {
      return [];
    }
    return events.filter((event) =>
      isSameDay(new Date(event.scheduled_at), selectedDay),
    );
  }, [events, selectedDay]);

  function syncDayInUrl(day: Date | undefined) {
    if (!day) {
      router.replace(pathname, { scroll: false });
      return;
    }
    router.replace(`${pathname}?dia=${format(day, "yyyy-MM-dd")}`, {
      scroll: false,
    });
  }

  function handleSelectDay(day: Date | undefined) {
    setSelectedDay(day);
    syncDayInUrl(day);
    if (day) {
      setWeekAnchor(day);
      setVisibleMonth(day);
    }
  }

  function handleMonthChange(month: Date) {
    setVisibleMonth(month);
    startTransition(async () => {
      await reloadAgenda(month);
    });
  }

  function handleToday() {
    const today = new Date();
    setWeekAnchor(today);
    setVisibleMonth(today);
    setSelectedDay(undefined);
    syncDayInUrl(undefined);
    startTransition(async () => {
      await reloadAgenda(today);
    });
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 md:h-[calc(100svh-3.5rem-3rem)] md:overflow-hidden lg:h-[calc(100svh-3.5rem-4rem)]">
      <h1 className="shrink-0 text-2xl font-semibold tracking-tight text-foreground">
        Agenda
      </h1>

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {events.length === 0 && selectedDay == null && !loadError ? (
        <Empty className="min-h-0 flex-1 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDays />
            </EmptyMedia>
            <EmptyTitle>Nenhum serviço agendado neste período</EmptyTitle>
            <EmptyDescription>
              Quando um serviço for pago, ele aparecerá na sua agenda.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start">
          <aside
            className="h-fit w-full shrink-0 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:w-96"
            aria-busy={isPending}
          >
            <AgendaMiniCalendar
              month={visibleMonth}
              selectedDay={selectedDay}
              daysWithEvents={daysWithEvents}
              onMonthChange={handleMonthChange}
              onSelectDay={handleSelectDay}
            />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:self-stretch">
            {selectedDay ? (
              <AgendaDayList
                date={selectedDay}
                events={selectedDayEvents}
                onSelectEvent={setSelectedEvent}
              />
            ) : (
              <>
                <div className="hidden min-h-0 flex-1 flex-col md:flex">
                  <AgendaWeekView
                    weekAnchor={weekAnchor}
                    events={events}
                    onSelectEvent={setSelectedEvent}
                    onWeekChange={setWeekAnchor}
                    onToday={handleToday}
                  />
                </div>
                <AgendaMobileWeekList
                  weekAnchor={weekAnchor}
                  events={events}
                  onSelectEvent={setSelectedEvent}
                />
              </>
            )}
          </div>
        </div>
      )}

      <AgendaEventDetailDialog
        event={selectedEvent}
        lightboxIndex={lightboxIndex}
        onLightboxIndexChange={setLightboxIndex}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
      />
    </div>
  );
}
