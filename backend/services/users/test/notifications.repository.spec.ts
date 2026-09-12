import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { NotificationsRepository } from "../src/notifications/notifications.repository";

describe("NotificationsRepository", () => {
  let repository: NotificationsRepository;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
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

  it("creates a notification for the authenticated recipient", async () => {
    mockPrisma.notification.create.mockResolvedValue({ id: "notif-1" });

    await repository.createNotification({
      recipient: "user-autenticado",
      type: "NEW_MESSAGE",
      title: "Olá",
      message: "Teste",
      relatedId: undefined,
      relatedType: undefined,
    });

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        recipient: "user-autenticado",
        type: "NEW_MESSAGE",
        title: "Olá",
        message: "Teste",
        relatedId: undefined,
        relatedType: undefined,
      },
    });
  });

  it("lists notifications by recipient ordered by creation", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    const where = { recipient: "user-1" };

    await repository.findNotificationsByRecipient(where, 0, 20);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where,
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
  });

  it("counts notifications by recipient", async () => {
    mockPrisma.notification.count.mockResolvedValue(2);
    const where = { recipient: "user-1", read: false };

    await repository.countNotificationsByRecipient(where);

    expect(mockPrisma.notification.count).toHaveBeenCalledWith({ where });
  });

  it("finds a notification scoped to its recipient", async () => {
    mockPrisma.notification.findFirst.mockResolvedValue({ id: "notif-1" });

    await repository.findNotificationForRecipient("notif-1", "user-1");

    expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: "notif-1", recipient: "user-1" },
    });
  });

  it("marks a notification as read", async () => {
    mockPrisma.notification.update.mockResolvedValue({ id: "notif-1" });

    await repository.markNotificationAsRead("notif-1");

    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: "notif-1" },
      data: { read: true },
    });
  });
});
