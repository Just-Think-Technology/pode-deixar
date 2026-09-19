// Mock notifications — seeded data for UI and E2E (NEXT_PUBLIC_USE_MOCK)

import type { Notification } from "@/api/notifications";

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "mock-notif-service-notifications-001",
    userId: "mock-client-id",
    type: "SERVICE",
    title: "Proposta aceita",
    message: "Pedido Conserto de vazamento no chuveiro (notificações) — proposta aceita",
    isRead: false,
    conversationId: null,
    contractId: "mock-notifications-order-001",
    createdAt: new Date("2026-09-18T11:00:00.000Z").toISOString(),
    readAt: null,
  },
  {
    id: "mock-notif-service-001",
    userId: "mock-client-id",
    type: "SERVICE",
    title: "Proposta aceita",
    message: "Pedido Conserto de vazamento no chuveiro — proposta aceita",
    isRead: false,
    conversationId: null,
    contractId: "mock-client-order-001",
    createdAt: new Date("2026-09-18T10:00:00.000Z").toISOString(),
    readAt: null,
  },
  {
    id: "mock-notif-conv-001",
    userId: "mock-client-id",
    type: "CONVERSATION",
    title: "Nova mensagem",
    message: "Carlos: olá, quando podemos agendar?",
    isRead: false,
    conversationId: "conv-001",
    contractId: null,
    createdAt: new Date("2026-09-18T10:05:00.000Z").toISOString(),
    readAt: null,
  },
  {
    id: "mock-notif-service-002",
    userId: "mock-client-id",
    type: "SERVICE",
    title: "Pagamento confirmado",
    message: "Pedido Pintura de quarto infantil — pagamento aprovado",
    isRead: true,
    conversationId: null,
    contractId: "mock-client-order-003",
    createdAt: new Date("2026-09-17T09:00:00.000Z").toISOString(),
    readAt: new Date("2026-09-17T10:00:00.000Z").toISOString(),
  },
  {
    id: "mock-notif-provider-001",
    userId: "mock-provider-id",
    type: "SERVICE",
    title: "Proposta aceita",
    message: "Pedido Conserto de vazamento — cliente aceitou sua proposta",
    isRead: false,
    conversationId: null,
    contractId: "mock-client-order-001",
    createdAt: new Date("2026-09-18T10:00:00.000Z").toISOString(),
    readAt: null,
  },
];

const MOCK_NOTIFICATIONS_VERSION = 2;

type MockNotificationsGlobal = typeof globalThis & {
  __podeDeixarMockNotifications?: Notification[];
  __podeDeixarMockNotificationsVersion?: number;
};

function cloneNotifications(): Notification[] {
  return structuredClone(MOCK_NOTIFICATIONS);
}

function getRuntimeNotifications(): Notification[] {
  const g = globalThis as MockNotificationsGlobal;
  if (
    !g.__podeDeixarMockNotifications ||
    g.__podeDeixarMockNotificationsVersion !== MOCK_NOTIFICATIONS_VERSION
  ) {
    g.__podeDeixarMockNotifications = cloneNotifications();
    g.__podeDeixarMockNotificationsVersion = MOCK_NOTIFICATIONS_VERSION;
  }
  return g.__podeDeixarMockNotifications;
}

export function resetMockNotifications(): void {
  const g = globalThis as MockNotificationsGlobal;
  g.__podeDeixarMockNotifications = cloneNotifications();
  g.__podeDeixarMockNotificationsVersion = MOCK_NOTIFICATIONS_VERSION;
}

export function getMockNotifications(userId?: string): Notification[] {
  const all = getRuntimeNotifications();
  const filtered = userId ? all.filter((n) => n.userId === userId) : all;
  // ordered desc by createdAt — matches repository ordering
  return structuredClone(filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function getMockUnreadCount(userId?: string): number {
  return getRuntimeNotifications().filter((n) => (userId ? n.userId === userId : true) && !n.isRead).length;
}

export function mockMarkNotificationRead(id: string): { count: number } {
  const all = getRuntimeNotifications();
  const found = all.find((n) => n.id === id);
  if (!found) return { count: 0 };
  if (!found.isRead) {
    found.isRead = true;
    found.readAt = new Date().toISOString();
  }
  return { count: 1 };
}

export function mockMarkAllRead(userId?: string): { count: number } {
  let count = 0;
  for (const n of getRuntimeNotifications()) {
    if ((userId ? n.userId === userId : true) && !n.isRead) {
      n.isRead = true;
      n.readAt = new Date().toISOString();
      count += 1;
    }
  }
  return { count };
}
