// Notifications actions — server actions with token refresh

"use server";

import {
  countUnread,
  getNotifications,
  markAllRead,
  markNotificationRead,
  type GetNotificationsParams,
  type Notification,
} from "@/api/notifications";
import { ApiError } from "@/api/client";
import {
  getAccessToken,
  refreshAuthSession,
} from "@/lib/auth/session.server";

// --- Helpers ---

async function withTokenRefresh<T>(fn: (token: string) => Promise<T>): Promise<T> {
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
      return fn(refreshed.access_token);
    }
    throw err;
  }
}

// --- Public API ---

/**
 * Fetches notifications for the authenticated user via server action with token refresh.
 * @param params - Optional filters by type and read state
 * @returns Notifications array
 */
export async function getNotificationsAction(
  params?: GetNotificationsParams,
): Promise<Notification[]> {
  return withTokenRefresh((token) => getNotifications(token, params));
}

/**
 * Marks a single notification as read via server action.
 * @param id - Notification id
 */
export async function markReadAction(id: string) {
  return withTokenRefresh((token) => markNotificationRead(token, id));
}

/**
 * Marks all notifications as read via server action.
 */
export async function markAllReadAction() {
  return withTokenRefresh((token) => markAllRead(token));
}

/**
 * Counts unread notifications via server action.
 * @returns Object with count
 */
export async function countUnreadAction(): Promise<{ count: number }> {
  return withTokenRefresh((token) => countUnread(token));
}
