// Worker agenda actions — event listing server actions

"use server";

import { ApiError } from "@/api/client";
import { getAgendaEvents } from "@/api/worker/agenda";
import { getAccessToken, refreshAuthSession } from "@/lib/auth/session.server";
import type {
  WorkerAgendaEvent,
  WorkerAgendaRange,
} from "@/lib/worker/agenda/types";

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
  return withTokenRefresh((token) => getAgendaEvents(token, range));
}