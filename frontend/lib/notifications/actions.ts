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
  getAuthSession,
  refreshAuthSession,
} from "@/lib/auth/session.server";
import {
  getMockNotifications,
  getMockUnreadCount,
  mockMarkAllRead,
  mockMarkNotificationRead,
} from "@/mock/notifications";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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
 * Falls back to mock data when NEXT_PUBLIC_USE_MOCK is enabled to keep E2E deterministic
 * without requiring the users service.
 *
 * @param params - Optional filters by type and read state
 * @returns Notifications array
 */
export async function getNotificationsAction(
  params?: GetNotificationsParams,
): Promise<Notification[]> {
  if (USE_MOCK) {
    let userId: string | undefined;
    try {
      const session = await getAuthSession();
      userId = session?.user?.id;
    } catch {
      userId = undefined;
    }
    let notifications = getMockNotifications(userId);
    if (params?.type) notifications = notifications.filter((n) => n.type === params.type);
    if (params?.isRead !== undefined) notifications = notifications.filter((n) => n.isRead === params.isRead);
    return notifications;
  }
  return withTokenRefresh((token) => getNotifications(token, params));
}

/**
 * Marks a single notification as read via server action.
 * @param id - Notification id
 */
export async function markReadAction(id: string) {
  if (USE_MOCK) {
    return mockMarkNotificationRead(id);
  }
  return withTokenRefresh((token) => markNotificationRead(token, id));
}

/**
 * Marks all notifications as read via server action.
 */
export async function markAllReadAction() {
  if (USE_MOCK) {
    try {
      const session = await getAuthSession();
      return mockMarkAllRead(session?.user?.id);
    } catch {
      return mockMarkAllRead();
    }
  }
  return withTokenRefresh((token) => markAllRead(token));
}

/**
 * Counts unread notifications via server action.
 * @returns Object with count
 */
export async function countUnreadAction(): Promise<{ count: number }> {
  if (USE_MOCK) {
    try {
      const session = await getAuthSession();
      return { count: getMockUnreadCount(session?.user?.id) };
    } catch {
      return { count: getMockUnreadCount() };
    }
  }
  return withTokenRefresh((token) => countUnread(token));
}
