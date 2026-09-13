import { Test, TestingModule } from "@nestjs/testing";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { NotificationsService } from "../src/notifications/notifications.service";
import { NotificationsRepository } from "../src/notifications/notifications.repository";
import { CreateNotificationDto } from "../src/notifications/dto/create-notification.dto";

// Anti-forgery coverage: the recipient is always the authenticated user;
// the client-supplied value is ignored.
describe("NotificationsService", () => {
  let service: NotificationsService;

  const mockRepository = {
    createNotification: jest.fn(),
    findNotificationsByRecipient: jest.fn(),
    countNotificationsByRecipient: jest.fn(),
    findNotificationForRecipient: jest.fn(),
    markNotificationAsRead: jest.fn(),
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

  it("should force recipient to the authenticated user, ignoring dto value", async () => {
    mockRepository.createNotification.mockResolvedValue({ id: "notif-1" });

    await service.create("user-autenticado", {
      recipient: "outra-vitima",
      type: "NEW_MESSAGE",
      title: "Olá",
      message: "Teste",
    } as CreateNotificationDto);

    expect(mockRepository.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: "user-autenticado" }),
    );
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
