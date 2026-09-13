// Notifications tests — delivery logic

import { Test, TestingModule } from "@nestjs/testing";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { NotificationsService } from "../src/notifications/notifications.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { CreateNotificationDto } from "../src/notifications/dto/create-notification.dto";

// --- Tests ---
// Anti-forgery coverage: the recipient is always the authenticated user;
// the client-supplied value is ignored.
describe("NotificationsService", () => {
  let service: NotificationsService;

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
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it("should force recipient to the authenticated user, ignoring dto value", async () => {
    mockPrisma.notification.create.mockResolvedValue({ id: "notif-1" });

    await service.create("user-autenticado", {
      recipient: "outra-vitima",
      type: "NEW_MESSAGE",
      title: "Olá",
      message: "Teste",
    } as CreateNotificationDto);

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ recipient: "user-autenticado" }),
    });
  });

  it("should reject invalid notification payload", async () => {
    const dto = plainToInstance(CreateNotificationDto, {
      recipient: "nao-uuid",
      type: "TIPO_FALSO",
      title: "x".repeat(201),
      message: 123,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it("should accept valid notification payload", async () => {
    const dto = plainToInstance(CreateNotificationDto, {
      type: "BUDGET",
      title: "Novo orçamento",
      message: "Você recebeu um orçamento",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
