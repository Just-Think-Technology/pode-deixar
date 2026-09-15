// Contract timeline — vertical event stepper for both profiles

import { Ban, Check, Circle, LoaderCircle } from "lucide-react";

import { getTimelineEventLabel } from "@/lib/tracking/labels";
import type { TimelineEvent } from "@/lib/tracking/types";
import { formatTrackingDateTime } from "@/lib/tracking/labels";
import { cn } from "@/lib/utils";

const STATE_STYLES: Record<
  TimelineEvent["state"],
  { dot: string; line: string; title: string }
> = {
  done: {
    dot: "border-emerald-500 bg-emerald-500 text-white",
    line: "bg-emerald-200",
    title: "text-foreground",
  },
  current: {
    dot: "border-[#2F80ED] bg-[#2F80ED] text-white ring-4 ring-[#2F80ED]/15",
    line: "bg-border",
    title: "text-foreground font-semibold",
  },
  pending: {
    dot: "border-border bg-muted text-muted-foreground",
    line: "bg-border",
    title: "text-muted-foreground",
  },
  cancelled: {
    dot: "border-slate-300 bg-slate-100 text-slate-500",
    line: "bg-border",
    title: "text-muted-foreground line-through",
  },
};

function StateIcon({ state }: { state: TimelineEvent["state"] }) {
  if (state === "done") {
    return <Check className="size-3.5" aria-hidden />;
  }
  if (state === "current") {
    return <LoaderCircle className="size-3.5" aria-hidden />;
  }
  if (state === "cancelled") {
    return <Ban className="size-3.5" aria-hidden />;
  }
  return <Circle className="size-3.5" aria-hidden />;
}

type ContractTimelineProps = {
  events: TimelineEvent[];
};

export function ContractTimeline({ events }: ContractTimelineProps) {
  return (
    <ol className="space-y-0" aria-label="Histórico da contratação">
      {events.map((event, index) => {
        const styles = STATE_STYLES[event.state];
        const isLast = index === events.length - 1;

        return (
          <li key={event.key} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 left-[13px] h-[calc(100%-1.75rem)] w-0.5",
                  styles.line,
                )}
              />
            ) : null}
            <span
              className={cn(
                "z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                styles.dot,
              )}
            >
              <StateIcon state={event.state} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn("text-sm", styles.title)}>
                {getTimelineEventLabel(event.key)}
              </p>
              {event.occurredAt ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatTrackingDateTime(event.occurredAt)}
                </p>
              ) : null}
              {event.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.description}
                </p>
              ) : null}
              {event.actorName ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Por {event.actorName}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
