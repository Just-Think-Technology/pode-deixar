// Notifications state — single home for bell data, badge count and read updates

"use client";

import { useCallback, useEffect, useState } from "react";

import type { Notification } from "@/api/notifications";
import {
  countUnreadAction,
  getNotificationsAction,
  markReadAction,
} from "@/lib/notifications/actions";

// --- Hook interface ---

export type UseNotifications = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

/**
 * Owns notification list state, badge count and read updates in one place.
 * The badge prefers the server count and falls back to the local filter
 * when the count endpoint fails. Refreshes when the dropdown opens so the
 * badge never goes stale.
 *
 * @returns Notifications state with refresh and markRead via interface
 */
export function useNotifications(): UseNotifications {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getNotificationsAction();
      setNotifications(data);
      try {
        const result = await countUnreadAction();
        setServerUnreadCount(result.count);
      } catch {
        setServerUnreadCount(null);
      }
    } catch {
      setError("Erro ao carregar notificações");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    try {
      await markReadAction(id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setServerUnreadCount((prev) =>
        prev !== null && prev > 0 ? prev - 1 : prev,
      );
    } catch {
      // silent — keep item unread when marking fails
    }
  }, []);

  const unreadCount =
    serverUnreadCount ?? notifications.filter((item) => !item.isRead).length;

  return { notifications, unreadCount, isLoading, error, refresh, markRead };
}
