// Worker agenda actions — event listing server actions

"use server";

import { ApiError } from "@/api/client/http";
import { withServerTokenRefresh } from "@/lib/auth/server-token-refresh";
import { getAgendaEvents } from "@/api/worker/agenda";
import type {
  WorkerAgendaEvent,
  WorkerAgendaRange,
} from "@/lib/worker/agenda/types";
import { getMockAgendaEvents } from "@/mock/worker/agenda";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getAgendaEventsAction(
  range: WorkerAgendaRange,
): Promise<WorkerAgendaEvent[]> {
  if (USE_MOCK) {
    return getMockAgendaEvents(range);
  }

  return withServerTokenRefresh((token) => getAgendaEvents(token, range));
}
