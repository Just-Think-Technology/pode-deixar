// Notification item — single notification row with title, message, time and read state

"use client";

import { useRouter } from "next/navigation";

import type { Notification } from "@/api/notifications";
import { cn } from "@/lib/utils";

type NotificationItemProps = {
  notification: Notification;
  role?: "CLIENT" | "PROVIDER" | "ADMIN";
  onRead?: (id: string) => void;
};

// --- Helpers ---

function getNotificationHref(
  notification: Notification,
  role?: string,
): string {
  if (notification.conversationId) {
    return `/messages/${notification.conversationId}`;
  }

  if (notification.contractId) {
    if (role === "PROVIDER") {
      return `/worker/orders/${notification.contractId}/tracking`;
    }
    return `/client/orders/${notification.contractId}/tracking`;
  }

  return "#";
}

function formatTime(createdAt: string): string {
  try {
    const date = new Date(createdAt);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return createdAt;
  }
}

// --- Component ---

export default function NotificationItem({
  notification,
  role,
  onRead,
}: NotificationItemProps) {
  const router = useRouter();

  function handleClick() {
    if (!notification.isRead) {
      onRead?.(notification.id);
    }

    const href = getNotificationHref(notification, role);
    if (href !== "#") {
      router.push(href);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted",
        notification.isRead ? "opacity-60" : "font-semibold",
      )}
    >
      <span className="text-sm text-foreground">{notification.title}</span>
      <span className="line-clamp-2 text-xs font-normal text-muted-foreground">
        {notification.message}
      </span>
      <span className="text-xs font-normal text-muted-foreground">
        {formatTime(notification.createdAt)}
      </span>
    </button>
  );
}

export { getNotificationHref };
