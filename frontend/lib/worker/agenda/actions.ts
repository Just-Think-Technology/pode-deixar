// Worker agenda actions — event listing server actions

"use server";

import { ApiError } from "@/api/client";
import { getAgendaEvents } from "@/api/worker/agenda";
import { getAccessToken, refreshAuthSession } from "@/lib/auth/session.server";
import type {
  WorkerAgendaEvent,
  WorkerAgendaRange,
} from "@/lib/worker/agenda/types";
import { getMockAgendaEvents } from "@/mock/worker/agenda";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

async function withTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    return await fn(token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const refreshed = await refreshAuthSession();
      if (!refreshed?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return await fn(refreshed.access_token);
    }
    throw err;
  }
}

export async function getAgendaEventsAction(
  range: WorkerAgendaRange,
): Promise<WorkerAgendaEvent[]> {
  if (USE_MOCK) {
    return getMockAgendaEvents(range);
  }

  return withTokenRefresh((token) => getAgendaEvents(token, range));
}
