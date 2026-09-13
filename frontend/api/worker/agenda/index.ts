// Worker agenda API — scheduled event fetchers

import { apiFetchAuth } from "@/api/client";
import type {
  WorkerAgendaEvent,
  WorkerAgendaRange,
} from "@/lib/worker/agenda/types";
import { getMockAgendaEvents } from "@/mock/worker/agenda";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const WORKER_AGENDA_ROUTES = {
  list: "/services/me/agenda",
} as const;

function buildAgendaPath(range: WorkerAgendaRange): string {
  const params = new URLSearchParams({
    from: range.from,
    to: range.to,
  });
  return `${WORKER_AGENDA_ROUTES.list}?${params.toString()}`;
}

export function getAgendaEvents(
  accessToken: string,
  range: WorkerAgendaRange,
): Promise<WorkerAgendaEvent[]> {
  if (USE_MOCK) {
    return Promise.resolve(getMockAgendaEvents(range));
  }

  return apiFetchAuth<WorkerAgendaEvent[]>(
    buildAgendaPath(range),
    accessToken,
    { method: "GET" },
  );
}
