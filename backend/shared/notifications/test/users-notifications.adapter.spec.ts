// UsersNotificationsAdapter spec — explicit DB seam via INotificationPort interface

import { PrismaService } from "@pode-deixar/prisma";
import { NotificationsService } from "../src/notification.service";
import { UsersNotificationsAdapter } from "../src/users-notifications.adapter";
import { INotificationPort } from "../src/notification.interface";

describe("UsersNotificationsAdapter (explicit DB seam)", () => {
  let adapter: INotificationPort;
  let core: NotificationsService;

  const mockPrisma = {
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (mockPrisma.notification.findFirst as unknown as jest.Mock) = jest
      .fn()
      .mockResolvedValue(null);
    (mockPrisma.notification.create as unknown as jest.Mock) = jest
      .fn()
      .mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "SERVICE",
        title: "Nova proposta",
        message: 'Nova proposta para "Order"',
        contractId: "order-1",
        createdAt: new Date(),
      });

    core = new NotificationsService(mockPrisma);
    adapter = new UsersNotificationsAdapter(core);
  });

  it("should be defined via INotificationPort interface token", () => {
    expect(adapter).toBeDefined();
    expect(adapter).toBeInstanceOf(UsersNotificationsAdapter);
  });

  it("should delegate notify(userId, type, title, message, dedupKey) via interface", async () => {
    const result = await adapter.notify(
      "user-1",
      "SERVICE",
      "Nova proposta",
      'Nova proposta para "Order"',
      "order-1",
      60000,
    );

    expect(result).toBeTruthy();
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        type: "SERVICE",
        contractId: "order-1",
      }),
    });
  });

  it("should delegate object form via interface", async () => {
    const result = await adapter.notify({
      userId: "user-1",
      type: "SERVICE",
      title: "Pagamento confirmado",
      message: "Pagamento confirmado",
      dedupKey: "order-1",
      ttl: 60000,
    });

    expect(result).toBeTruthy();
    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });

  it("should return null when duplicate exists — dedup via deep module", async () => {
    (mockPrisma.notification.findFirst as unknown as jest.Mock).mockResolvedValue({
      id: "existing",
    } as never);

    const result = await adapter.notify(
      "user-1",
      "SERVICE",
      "Nova proposta",
      "msg",
      "order-1",
    );

    expect(result).toBeNull();
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it("should expose existsRecent via interface for explicit dedup checks", async () => {
    const port = adapter as unknown as UsersNotificationsAdapter;
    const exists = await port.existsRecent({
      userId: "user-1",
      type: "SERVICE",
      title: "Nova proposta",
      contractId: "order-1",
    });

    expect(typeof exists).toBe("boolean");
    expect(mockPrisma.notification.findFirst).toHaveBeenCalled();
  });

  it("should keep DB seam explicit — only shared module touches prisma.notification", async () => {
    // This test documents the architecture invariant: payments/reviews/service-orders
    // must not call prisma.notification.create directly, but via UsersNotificationsAdapter port.
    // Here we verify the adapter is the explicit seam that delegates to deep module (core).
    const spy = jest.spyOn(core, "notify");
    await adapter.notify("user-1", "SERVICE", "T", "M", "k");
    expect(spy).toHaveBeenCalled();
  });
});
