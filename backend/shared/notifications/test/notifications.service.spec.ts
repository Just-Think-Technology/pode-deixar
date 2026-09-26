// Notifications service spec — shared port handles existsRecent + P2002 + rate-limit via interface

import { NotificationsService } from "../src/notification.service";
import { Prisma } from "@prisma/client";

describe("NotificationsService (shared port)", () => {
  let service: NotificationsService;

  const mockPrisma = {
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as import("@pode-deixar/prisma").PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.notification.findFirst = jest.fn().mockResolvedValue(null);
    mockPrisma.notification.create = jest.fn().mockResolvedValue({
      id: "notif-1",
      userId: "user-1",
      type: "SERVICE",
      title: "Nova proposta",
      message: 'Nova proposta para "Order"',
      contractId: "order-1",
      createdAt: new Date(),
    });

    service = new NotificationsService(mockPrisma);
  });

  it("should create notification via notify(userId, type, title, message, dedupKey, ttl)", async () => {
    const result = await service.notify(
      "user-1",
      "SERVICE",
      "Nova proposta",
      'Nova proposta para "Order"',
      "order-1",
      60000,
    );

    expect(result).toBeTruthy();
    expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: "user-1",
        type: "SERVICE",
        title: "Nova proposta",
        contractId: "order-1",
      }),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        type: "SERVICE",
        title: "Nova proposta",
        contractId: "order-1",
      }),
    });
  });

  it("should create via object form notify({userId, type, title, message, dedupKey, ttl})", async () => {
    const result = await service.notify({
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

  it("should return null when duplicate exists within ttl window", async () => {
    mockPrisma.notification.findFirst = jest.fn().mockResolvedValue({
      id: "existing",
    } as any);

    const result = await service.notify(
      "user-1",
      "SERVICE",
      "Nova proposta",
      "msg",
      "order-1",
    );

    expect(result).toBeNull();
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it("should return null and handle P2002 on race duplicate", async () => {
    mockPrisma.notification.findFirst = jest.fn().mockResolvedValue(null);
    mockPrisma.notification.create = jest
      .fn()
      .mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          "Unique constraint",
          { code: "P2002", clientVersion: "5.22.0" } as any,
        ),
      );

    const result = await service.notify(
      "user-1",
      "SERVICE",
      "Nova proposta",
      "msg",
      "order-1",
    );

    expect(result).toBeNull();
  });

  it("should enforce rate-limit after 10 notifications per window", async () => {
    mockPrisma.notification.findFirst = jest.fn().mockResolvedValue(null);
    mockPrisma.notification.create = jest.fn().mockResolvedValue({
      id: "notif",
    } as any);

    for (let i = 0; i < 10; i++) {
      await service.notify(
        "user-1",
        "SERVICE",
        `Title-${i}`,
        "msg",
        `order-${i}`,
      );
    }

    const limited = await service.notify(
      "user-1",
      "SERVICE",
      "Title-10",
      "msg",
      "order-10",
    );

    expect(limited).toBeNull();
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(10);
  });

  it("should handle dedupKey as conversationId for CONVERSATION type", async () => {
    await service.notify(
      "user-1",
      "CONVERSATION",
      "Nova mensagem",
      "Você recebeu uma mensagem",
      "conv-1",
    );

    expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        conversationId: "conv-1",
      }),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: "conv-1",
      }),
    });
  });
});
