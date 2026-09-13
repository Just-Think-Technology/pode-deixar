// Agenda mini calendar — month picker for agenda navigation

"use client";

import { ptBR } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type AgendaMiniCalendarProps = {
  month: Date;
  selectedDay: Date | undefined;
  daysWithEvents: Date[];
  onMonthChange: (month: Date) => void;
  onSelectDay: (day: Date | undefined) => void;
};

export function AgendaMiniCalendar({
  month,
  selectedDay,
  daysWithEvents,
  onMonthChange,
  onSelectDay,
}: AgendaMiniCalendarProps) {
  return (
    <div data-slot="agenda-mini-calendar">
      <Calendar
        mode="single"
        locale={ptBR}
        month={month}
        selected={selectedDay}
        onSelect={onSelectDay}
        onMonthChange={onMonthChange}
        showOutsideDays
        modifiers={{ hasEvent: daysWithEvents }}
        modifiersClassNames={{
          hasEvent: cn(
            "after:pointer-events-none after:absolute after:bottom-0.5 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-[#2F80ED]",
            "has-[[data-selected-single=true]]:after:bg-primary-foreground",
          ),
        }}
        classNames={{ root: "w-full" }}
        className="w-full p-1 [--cell-size:2.75rem] lg:[--cell-size:3rem]"
      />
    </div>
  );
}
