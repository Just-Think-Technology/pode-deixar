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
import { ApiError } from "@/api/client/http";
import { withServerTokenRefresh } from "@/lib/auth/server-token-refresh";
import {
  getAuthSession,
} from "@/lib/auth/session.server";
import {
  getMockNotifications,
  getMockUnreadCount,
  mockMarkAllRead,
  mockMarkNotificationRead,
} from "@/mock/notifications";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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
  return withServerTokenRefresh((token) => getNotifications(token, params));
}

/**
 * Marks a single notification as read via server action.
 * @param id - Notification id
 */
export async function markReadAction(id: string) {
  if (USE_MOCK) {
    return mockMarkNotificationRead(id);
  }
  return withServerTokenRefresh((token) => markNotificationRead(token, id));
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
  return withServerTokenRefresh((token) => markAllRead(token));
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
  return withServerTokenRefresh((token) => countUnread(token));
}
