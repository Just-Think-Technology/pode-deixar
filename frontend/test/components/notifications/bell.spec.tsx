// Bell spec — badge, tabs, loading/empty/error and notification item

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import Bell from "@/components/shared/notifications/bell";
import NotificationItem from "@/components/shared/notifications/notification-item";
import {
  countUnreadAction,
  getNotificationsAction,
} from "@/lib/notifications/actions";
import type { Notification } from "@/api/notifications";

// Mock next/navigation router
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock server actions to avoid RSC import issues in jsdom
vi.mock("@/lib/notifications/actions", () => ({
  getNotificationsAction: vi.fn().mockResolvedValue([]),
  countUnreadAction: vi.fn().mockResolvedValue({ count: 0 }),
  markReadAction: vi.fn().mockResolvedValue({ count: 1 }),
}));

const mockList = vi.mocked(getNotificationsAction);
const mockCount = vi.mocked(countUnreadAction);

// Mock dropdown menu portal to avoid Base UI portal handling in jsdom
vi.mock("@/components/ui/dropdown-menu", async () => {
  const actual = await vi.importActual("@/components/ui/dropdown-menu") as any;
  return {
    ...actual,
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children, render }: any) => {
      if (render) {
        // render is a React element (Button); merge props and children
        return (
          <button aria-label={render.props?.["aria-label"] ?? "Notificações"}>
            {children}
          </button>
        );
      }
      return <button aria-label="Notificações">{children}</button>;
    },
  };
});

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "1",
    userId: "u1",
    type: "CONVERSATION",
    title: "Nova mensagem",
    message: "Carlos: oi",
    isRead: false,
    conversationId: "c1",
    contractId: null,
    createdAt: new Date("2026-09-18T10:00:00Z").toISOString(),
    readAt: null,
    ...overrides,
  };
}

describe("Bell component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockCount.mockResolvedValue({ count: 0 });
  });

  it("shows unread badge and separates tabs", async () => {
    mockList.mockResolvedValue([
      makeNotification({ id: "1", type: "CONVERSATION", isRead: false }),
      makeNotification({ id: "2", type: "SERVICE", isRead: true, conversationId: null, contractId: "ord-1" }),
    ]);
    mockCount.mockResolvedValue({ count: 1 });
    render(<Bell />);

    expect(await screen.findByText("1")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    expect(screen.getByRole("tab", { name: "Conversas" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Serviços" })).toBeVisible();
  });

  it("renders loading skeleton inside tabs when open", async () => {
    mockList.mockReturnValue(new Promise(() => {}));
    render(<Bell />);

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    // Skeleton has data-slot skeleton
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error alert with retry", async () => {
    mockList.mockRejectedValue(new Error("offline"));
    render(<Bell />);

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    expect(await screen.findByText("Erro ao carregar notificações")).toBeVisible();
    const retry = screen.getByRole("button", { name: "Tentar novamente" });
    expect(retry).toBeVisible();

    mockList.mockResolvedValue([]);
    fireEvent.click(retry);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it("shows empty state when no notifications for tab", async () => {
    render(<Bell />);

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    expect(await screen.findByText("Você não possui novas notificações.")).toBeVisible();
  });

  it("renders notification items filtered by tab", async () => {
    mockList.mockResolvedValue([
      makeNotification({ id: "1", type: "CONVERSATION", title: "Conversa 1" }),
      makeNotification({ id: "2", type: "SERVICE", title: "Serviço 1", conversationId: null, contractId: "ord-1" }),
    ]);
    render(<Bell />);

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    // default tab Conversas should show only Conversa 1
    expect(await screen.findByText("Conversa 1")).toBeVisible();
    expect(screen.queryByText("Serviço 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Serviços" }));
    expect(screen.getByText("Serviço 1")).toBeVisible();
  });

  it("shows badge count for multiple unread", async () => {
    mockList.mockResolvedValue([
      makeNotification({ id: "1", isRead: false }),
      makeNotification({ id: "2", isRead: false }),
      makeNotification({ id: "3", isRead: true }),
    ]);
    mockCount.mockRejectedValue(new Error("offline"));
    render(<Bell />);

    expect(await screen.findByText("2")).toBeVisible();
  });

  it("does not show badge when all read", async () => {
    mockList.mockResolvedValue([makeNotification({ id: "1", isRead: true })]);
    render(<Bell />);

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });
});

describe("NotificationItem", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders title, message, time and read state", () => {
    const n = makeNotification({ title: "Proposta aceita", message: "Pedido 123", isRead: false });
    const { container } = render(<NotificationItem notification={n} />);

    expect(screen.getByText("Proposta aceita")).toBeVisible();
    expect(screen.getByText("Pedido 123")).toBeVisible();
    // unread has font-semibold
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("font-semibold");
  });

  it("applies opacity when read", () => {
    const n = makeNotification({ isRead: true });
    const { container } = render(<NotificationItem notification={n} />);
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("opacity-60");
  });

  it("navigates to conversationId and marks read", async () => {
    const onRead = vi.fn();
    const n = makeNotification({ id: "notif-1", conversationId: "conv-99", isRead: false });

    render(<NotificationItem notification={n} onRead={onRead} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onRead).toHaveBeenCalledWith("notif-1");
    expect(pushMock).toHaveBeenCalledWith("/messages/conv-99");
  });

  it("navigates to contractId respecting role", async () => {
    const n = makeNotification({ conversationId: null, contractId: "order-123", isRead: true });

    const { rerender } = render(<NotificationItem notification={n} role="CLIENT" />);
    fireEvent.click(screen.getByRole("button"));
    expect(pushMock).toHaveBeenCalledWith("/client/orders/order-123/tracking");

    pushMock.mockClear();
    rerender(<NotificationItem notification={{ ...n, contractId: "order-456" } as Notification} role="PROVIDER" />);
    fireEvent.click(screen.getByRole("button"));
    expect(pushMock).toHaveBeenCalledWith("/worker/orders/order-456/tracking");
  });
});
