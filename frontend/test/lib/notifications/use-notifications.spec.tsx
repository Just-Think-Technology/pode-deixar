import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useNotifications } from "@/lib/notifications/use-notifications";
import {
  countUnreadAction,
  getNotificationsAction,
  markReadAction,
} from "@/lib/notifications/actions";
import type { Notification } from "@/api/notifications";

vi.mock("@/lib/notifications/actions", () => ({
  countUnreadAction: vi.fn(),
  getNotificationsAction: vi.fn(),
  markReadAction: vi.fn(),
}));

const mockList = vi.mocked(getNotificationsAction);
const mockCount = vi.mocked(countUnreadAction);
const mockMarkRead = vi.mocked(markReadAction);

function buildNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: "notif-1",
    type: "SERVICE",
    title: "Serviço iniciado",
    message: "O prestador iniciou o serviço",
    isRead: false,
    readAt: null,
    createdAt: "2026-09-20T10:00:00.000Z",
    ...overrides,
  } as Notification;
}

describe("lib/notifications/use-notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([buildNotification()]);
    mockCount.mockResolvedValue({ count: 1 });
    mockMarkRead.mockResolvedValue(undefined as never);
  });

  it("carrega lista e prefere a contagem do servidor", async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockList).toHaveBeenCalled();
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("recorre à contagem local quando o endpoint de contagem falha", async () => {
    mockCount.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.unreadCount).toBe(1);
  });

  it("expõe erro quando a lista falha", async () => {
    mockList.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Erro ao carregar notificações");
    expect(result.current.notifications).toHaveLength(0);
  });

  it("marca como lida e decrementa a contagem", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markRead("notif-1");
    });

    expect(mockMarkRead).toHaveBeenCalledWith("notif-1");
    expect(result.current.notifications[0]?.isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("mantém não lida quando marcar falha", async () => {
    mockMarkRead.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markRead("notif-1");
    });

    expect(result.current.notifications[0]?.isRead).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });

  it("recarrega via refresh", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockList.mockResolvedValue([]);
    mockCount.mockResolvedValue({ count: 0 });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });
});
