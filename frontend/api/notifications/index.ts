// Notifications API — fetchers for user notifications

import { apiFetchAuth } from "@/api/client/http";

// --- Types ---

export type NotificationType = "CONVERSATION" | "SERVICE";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  conversationId?: string | null;
  contractId?: string | null;
  createdAt: string;
  readAt?: string | null;
};

export type GetNotificationsParams = {
  type?: NotificationType;
  isRead?: boolean;
};

// --- Routes ---

export const NOTIFICATIONS_ROUTES = {
  list: "/notifications",
  unreadCount: "/notifications/unread-count",
  markRead: (id: string) => `/notifications/${id}/read`,
  markAllRead: "/notifications/read-all",
} as const;

// --- Fetchers ---

/**
 * Lists notifications for the authenticated user with optional filters.
 * @param accessToken - JWT access token
 * @param params - Optional filters by type and read state
 * @returns Notifications ordered by createdAt desc
 */
export function getNotifications(
  accessToken: string,
  params?: GetNotificationsParams,
): Promise<Notification[]> {
  const searchParams = new URLSearchParams();

  if (params?.type) {
    searchParams.set("type", params.type);
  }

  if (params?.isRead !== undefined) {
    searchParams.set("isRead", String(params.isRead));
  }

  const qs = searchParams.toString();
  const path = qs ? `${NOTIFICATIONS_ROUTES.list}?${qs}` : NOTIFICATIONS_ROUTES.list;

  return apiFetchAuth<Notification[]>(path, accessToken, { method: "GET" });
}

/**
 * Counts unread notifications for the authenticated user.
 * @param accessToken - JWT access token
 * @returns Object with count
 */
export function countUnread(
  accessToken: string,
): Promise<{ count: number }> {
  return apiFetchAuth<{ count: number }>(NOTIFICATIONS_ROUTES.unreadCount, accessToken, {
    method: "GET",
  });
}

/**
 * Marks a single notification as read.
 * @param accessToken - JWT access token
 * @param id - Notification id
 */
export function markNotificationRead(
  accessToken: string,
  id: string,
): Promise<{ count: number } | Notification> {
  return apiFetchAuth(NOTIFICATIONS_ROUTES.markRead(id), accessToken, {
    method: "POST",
  });
}

/**
 * Alias for markNotificationRead (spec naming markRead).
 * @param accessToken - JWT access token
 * @param id - Notification id
 */
export function markRead(accessToken: string, id: string) {
  return markNotificationRead(accessToken, id);
}

/**
 * Marks all notifications as read for the authenticated user.
 * @param accessToken - JWT access token
 */
export function markAllRead(
  accessToken: string,
): Promise<{ count: number }> {
  return apiFetchAuth(NOTIFICATIONS_ROUTES.markAllRead, accessToken, {
    method: "POST",
  });
}
