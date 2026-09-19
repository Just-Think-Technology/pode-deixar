import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { NotificationsRepository } from "../src/notifications/notifications.repository";
import { NotificationType } from "@prisma/client";

describe("NotificationsRepository", () => {
  let repository: NotificationsRepository;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<NotificationsRepository>(NotificationsRepository);
    jest.clearAllMocks();
  });

  it("creates a notification with CONVERSATION type", async () => {
    mockPrisma.notification.create.mockResolvedValue({
      id: "n1",
      type: NotificationType.CONVERSATION,
    });

    const result = await repository.create({
      userId: "u1",
      type: NotificationType.CONVERSATION,
      title: "Nova mensagem",
      message: "Carlos: oi",
      conversationId: "c1",
    });

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        type: NotificationType.CONVERSATION,
        title: "Nova mensagem",
        message: "Carlos: oi",
        conversationId: "c1",
        contractId: null,
      },
    });
    expect(result.type).toBe(NotificationType.CONVERSATION);
  });

  it("lists only owner notifications ordered desc", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([
      { id: "n1", contractId: "c1" },
    ]);

    const list = await repository.findByUser("u1");
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { createdAt: "desc" },
    });
    expect(list[0].contractId).toBe("c1");

    mockPrisma.notification.findMany.mockResolvedValue([]);
    expect(await repository.findByUser("u2")).toEqual([]);
  });

  it("filters by type and isRead", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    await repository.findByUser("u1", {
      type: NotificationType.SERVICE,
      isRead: false,
    });
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", type: NotificationType.SERVICE, isRead: false },
      orderBy: { createdAt: "desc" },
    });
  });

  it("marks a notification as read scoped to user", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
    await repository.markRead("n1", "u1");
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", userId: "u1" },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });

  it("marks all unread as read", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });
    await repository.markAllRead("u1");
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", isRead: false },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });

  it("counts unread notifications", async () => {
    mockPrisma.notification.count.mockResolvedValue(3);
    const count = await repository.countUnread("u1");
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId: "u1", isRead: false },
    });
    expect(count).toBe(3);
  });

  it("checks recent duplicate within 60s window", async () => {
    mockPrisma.notification.findFirst.mockResolvedValue({ id: "n1" });
    const exists = await repository.existsRecent({
      userId: "u1",
      type: NotificationType.SERVICE,
      title: "Proposta aceita",
      contractId: "c1",
      windowMs: 60000,
    });
    expect(exists).toBe(true);
    expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        type: NotificationType.SERVICE,
        title: "Proposta aceita",
        contractId: "c1",
        createdAt: { gte: expect.any(Date) },
      },
    });

    mockPrisma.notification.findFirst.mockResolvedValue(null);
    const notExists = await repository.existsRecent({
      userId: "u1",
      type: NotificationType.SERVICE,
      title: "Outro",
      contractId: "c2",
    });
    expect(notExists).toBe(false);
  });
});
