// Notifications service tests — notify dedup, list, markRead, markAllRead, countUnread

import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { NotificationsService } from "../src/notifications/notifications.service";
import { NotificationsRepository } from "../src/notifications/notifications.repository";

describe("NotificationsService", () => {
  let service: NotificationsService;

  const mockRepository = {
    create: jest.fn(),
    findByUser: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    countUnread: jest.fn(),
    existsRecent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it("does not create duplicate SERVICE event within 60s", async () => {
    mockRepository.existsRecent.mockResolvedValue(true);

    const result = await service.notify({
      userId: "u1",
      type: NotificationType.SERVICE,
      title: "Proposta aceita",
      message: "Pedido 123",
      contractId: "c1",
    });

    expect(result).toBeNull();
    expect(mockRepository.create).not.toHaveBeenCalled();
    expect(mockRepository.existsRecent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        type: NotificationType.SERVICE,
        title: "Proposta aceita",
        contractId: "c1",
        windowMs: 60000,
      }),
    );
  });

  it("creates notification when no recent duplicate", async () => {
    mockRepository.existsRecent.mockResolvedValue(false);
    mockRepository.create.mockResolvedValue({ id: "n1" });

    const result = await service.notify({
      userId: "u1",
      type: NotificationType.SERVICE,
      title: "Proposta aceita",
      message: "Pedido 123",
      contractId: "c1",
    });

    expect(mockRepository.create).toHaveBeenCalledWith({
      userId: "u1",
      type: NotificationType.SERVICE,
      title: "Proposta aceita",
      message: "Pedido 123",
      conversationId: null,
      contractId: "c1",
    });
    expect(result).toEqual({ id: "n1" });
  });

  it("lists notifications filtered by user", async () => {
    mockRepository.findByUser.mockResolvedValue([{ id: "n1" }]);
    const list = await service.list("u1", { type: NotificationType.SERVICE });
    expect(mockRepository.findByUser).toHaveBeenCalledWith("u1", {
      type: NotificationType.SERVICE,
    });
    expect(list).toEqual([{ id: "n1" }]);
  });

  it("throws NotFound if markRead affects 0 rows", async () => {
    mockRepository.markRead.mockResolvedValue({ count: 0 });
    await expect(service.markRead("u1", "n-missing")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("marks read when notification belongs to user", async () => {
    mockRepository.markRead.mockResolvedValue({ count: 1 });
    const res = await service.markRead("u1", "n1");
    expect(res).toEqual({ count: 1 });
    expect(mockRepository.markRead).toHaveBeenCalledWith("n1", "u1");
  });

  it("marks all as read", async () => {
    mockRepository.markAllRead.mockResolvedValue({ count: 3 });
    const res = await service.markAllRead("u1");
    expect(mockRepository.markAllRead).toHaveBeenCalledWith("u1");
    expect(res).toEqual({ count: 3 });
  });

  it("counts unread", async () => {
    mockRepository.countUnread.mockResolvedValue(2);
    const count = await service.countUnread("u1");
    expect(count).toBe(2);
    expect(mockRepository.countUnread).toHaveBeenCalledWith("u1");
  });

  it("supports CONVERSATION dedup with conversationId", async () => {
    mockRepository.existsRecent.mockResolvedValue(false);
    mockRepository.create.mockResolvedValue({ id: "n2" });
    await service.notify({
      userId: "u1",
      type: NotificationType.CONVERSATION,
      title: "Nova mensagem",
      message: "oi",
      conversationId: "conv1",
    });
    expect(mockRepository.existsRecent).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "conv1" }),
    );
  });
});
