import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { PaymentsService } from "../src/payments/payments.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { PaymentGatewayFactory } from "../src/gateway/payment-gateway.factory";
import { PaymentGateway } from "../src/gateway/payment-gateway.interface";
import { PaymentLoggerService } from "../src/payments/payment-logger.service";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let prisma: {
    payment: {
      findMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    paymentWebhookEvent: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    paymentStatusHistory: {
      create: jest.Mock;
    };
    serviceOrder: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    proposal: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let gateways: {
    active: PaymentGateway;
    mock: PaymentGateway;
    getByName: jest.Mock;
  };
  let logger: {
    logPaymentCreated: jest.Mock;
    logPaymentStatusChange: jest.Mock;
    logWebhookReceived: jest.Mock;
    logPaymentError: jest.Mock;
    logSuspiciousActivity: jest.Mock;
    logAuthenticationFailure: jest.Mock;
  };

  function createGateway(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
    return {
      name: "MERCADO_PAGO",
      isConfigured: false,
      createCharge: jest.fn(),
      getPayment: jest.fn(),
      validateWebhook: jest.fn().mockReturnValue(true),
      extractEventId: jest.fn().mockReturnValue("event-1"),
      extractGatewayPaymentId: jest.fn().mockReturnValue("12345"),
      translateStatus: jest.fn().mockReturnValue("PAID"),
      ...overrides,
    } as PaymentGateway;
  }

  const userId = "user-1";

  beforeEach(async () => {
    prisma = {
      payment: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      paymentWebhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      paymentStatusHistory: {
        create: jest.fn(),
      },
      serviceOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      proposal: {
        findMany: jest.fn(),
      },
      // Supports both $transaction forms: array (create) and callback (webhook claim-first).
      $transaction: jest.fn(async (arg: any) => {
        if (typeof arg === "function") {
          return arg(prisma);
        }
        return Promise.all(arg);
      }),
    };
    gateways = {
      active: createGateway(),
      mock: createGateway({ name: "MOCK" }),
      getByName: jest.fn(),
    };
    logger = {
      logPaymentCreated: jest.fn(),
      logPaymentStatusChange: jest.fn(),
      logWebhookReceived: jest.fn(),
      logPaymentError: jest.fn(),
      logSuspiciousActivity: jest.fn(),
      logAuthenticationFailure: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentGatewayFactory, useValue: gateways },
        { provide: PaymentLoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should filter payments of the authenticated client", async () => {
      const payments = [
        {
          id: "payment-1",
          serviceOrderId: "order-1",
          amount: 150.5,
          method: "PIX",
          status: "PAID",
        },
      ];
      prisma.payment.findMany.mockResolvedValue(payments);

      const result = await service.findAll(userId);

      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { serviceOrder: { clientId: userId } },
        include: {
          serviceOrder: {
            select: {
              id: true,
              title: true,
              clientId: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(payments);
    });
  });

  describe("create", () => {
    const scheduledAt = "2026-08-20T14:00:00.000Z";

    const dto = {
      serviceOrderId: "order-1",
      method: PaymentMethod.PIX,
      scheduledAt,
    };

    it("should register the transaction with the order price", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({
        id: "payment-1",
        serviceOrderId: "order-1",
        amount: 150,
        currency: "BRL",
        method: "PIX",
        status: "PENDING",
      });
      prisma.serviceOrder.update.mockResolvedValue({ id: "order-1" });

      const result = await service.create(userId, dto);

      expect(prisma.serviceOrder.findUnique).toHaveBeenCalledWith({
        where: { id: "order-1" },
        include: {
          proposals: {
            where: { status: "ACCEPTED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      expect(prisma.serviceOrder.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: {
          scheduledAt: new Date(scheduledAt),
          scheduledEndAt: null,
        },
      });
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          serviceOrderId: "order-1",
          amount: 150,
          currency: "BRL",
          method: "PIX",
          status: "PENDING",
          feeRate: 0.1,
          feeAmount: 15,
          netAmount: 135,
          // Key generated in code when the client omits it.
          idempotencyKey: expect.any(String),
        },
      });
      expect(result).toEqual(expect.objectContaining({ amount: 150 }));
    });

    it("should persist the platform fee configured in PLATFORM_FEE_RATE", async () => {
      process.env.PLATFORM_FEE_RATE = "0.2";
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({
        id: "payment-1",
        amount: 150,
      });
      prisma.serviceOrder.update.mockResolvedValue({ id: "order-1" });

      await service.create(userId, dto);

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feeRate: 0.2,
            feeAmount: 30,
            netAmount: 120,
          }),
        }),
      );
      delete process.env.PLATFORM_FEE_RATE;
    });

    it("should use the accepted proposal price when there is no agreedPrice", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: null,
        proposals: [{ id: "proposal-1", price: 220 }],
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({
        id: "payment-1",
        amount: 220,
      });
      prisma.serviceOrder.update.mockResolvedValue({ id: "order-1" });

      await service.create(userId, dto);

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 220 }),
        }),
      );
    });

    it("should store the schedule end when provided", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({ id: "payment-1", amount: 150 });
      prisma.serviceOrder.update.mockResolvedValue({ id: "order-1" });

      await service.create(userId, {
        ...dto,
        scheduledEndAt: "2026-08-20T17:00:00.000Z",
      });

      expect(prisma.serviceOrder.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: {
          scheduledAt: new Date(scheduledAt),
          scheduledEndAt: new Date("2026-08-20T17:00:00.000Z"),
        },
      });
    });

    it("should throw BadRequestException when the end is before the start", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });

      await expect(
        service.create(userId, {
          ...dto,
          scheduledEndAt: "2026-08-20T13:00:00.000Z",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when the order does not exist", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when the order does not belong to the client", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: "outro-usuario",
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the order has no price set", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: null,
        proposals: [],
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when the order is cancelled", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "CANCELLED",
        agreedPrice: 150,
        proposals: [],
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the order amount is invalid", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 0,
        proposals: [],
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the currency is not supported", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });

      await expect(
        service.create(userId, { ...dto, currency: "USD" as any }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it("should persist the currency and idempotency key when provided", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({ id: "payment-1" });

      await service.create(userId, {
        ...dto,
        currency: "BRL",
        idempotencyKey: "chave-123",
      });

      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { serviceOrderId: "order-1", idempotencyKey: "chave-123" },
      });
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: "BRL",
            idempotencyKey: "chave-123",
          }),
        }),
      );
    });

    it("should return the existing payment when the idempotency key was already used", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      const existingPayment = { id: "payment-existing", status: "PENDING" };
      prisma.payment.findFirst.mockResolvedValue(existingPayment);

      const result = await service.create(userId, {
        ...dto,
        idempotencyKey: "chave-repetida",
      });

      expect(result).toEqual(existingPayment);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe("generateCharge", () => {
    it("should throw NotFoundException when the payment does not exist", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.generateCharge(userId, "payment-x"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when the payment does not belong to the client", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        serviceOrder: { clientId: "outro-usuario" },
      });

      await expect(
        service.generateCharge(userId, "payment-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when the payment is not pending", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        serviceOrder: { clientId: userId },
      });

      await expect(
        service.generateCharge(userId, "payment-1"),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the charge was already generated (externalRef present)", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        externalRef: "chg_anterior",
        serviceOrder: { clientId: userId },
      });

      await expect(
        service.generateCharge(userId, "payment-1"),
      ).rejects.toThrow(BadRequestException);
      expect(gateways.active.createCharge).not.toHaveBeenCalled();
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the atomic claim loses the race", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        externalRef: null,
        method: PaymentMethod.PIX,
        amount: 150,
        serviceOrder: { clientId: userId },
      });
      prisma.payment.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.generateCharge(userId, "payment-1"),
      ).rejects.toThrow("Cobrança já gerada");
      expect(gateways.active.createCharge).not.toHaveBeenCalled();
    });

    describe("without a configured gateway (mock active)", () => {
      beforeEach(() => {
        gateways.active = createGateway({
          name: "MOCK",
          isConfigured: true,
          createCharge: jest.fn().mockResolvedValue({
            id: "chg_mock_payment1",
            status: "PENDING",
            cobranca: { pixCopiaECola: "00020126580014br.gov.bcb.pix..." },
          }),
        });
      });

      it("should generate the charge via the active gateway and persist externalRef", async () => {
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
          serviceOrder: { clientId: userId },
        });
        prisma.payment.updateMany
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 });

        const result = await service.generateCharge(userId, "payment-1");

        expect(gateways.active.createCharge).toHaveBeenCalledWith({
          amount: 150,
          externalReference: "payment-1",
          method: PaymentMethod.PIX,
          description: "Pedido payment-1",
        });
        expect(prisma.payment.updateMany).toHaveBeenNthCalledWith(1, {
          where: { id: "payment-1", externalRef: null },
          data: { externalRef: expect.any(String) },
        });
        expect(prisma.payment.updateMany).toHaveBeenNthCalledWith(2, {
          where: { id: "payment-1", externalRef: expect.any(String) },
          data: { externalRef: "chg_mock_payment1" },
        });
        expect(result).toEqual({
          paymentId: "payment-1",
          chargeRef: "chg_mock_payment1",
          status: "PENDING",
          cobranca: { pixCopiaECola: "00020126580014br.gov.bcb.pix..." },
        });
      });

      it("should generate a checkout link for credit card via the mock gateway", async () => {
        (gateways.mock.createCharge as jest.Mock).mockResolvedValue({
          id: "chg_mock_payment2",
          status: "PENDING",
          cobranca: {
            linkCheckout: "https://checkout.mock.pode-deixar.com/chg_mock_payment2",
          },
        });
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-2",
          method: PaymentMethod.CREDIT_CARD,
          status: "PENDING",
          amount: 80,
          serviceOrder: { clientId: userId },
        });
        prisma.payment.updateMany
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 });

        const result = await service.generateCharge(userId, "payment-2");

        expect(gateways.mock.createCharge).toHaveBeenCalled();
        expect(
          (result.cobranca as Record<string, string>).linkCheckout,
        ).toMatch(/^https:\/\/checkout\.mock\.pode-deixar\.com\//);
      });
    });

    describe("with a configured gateway (Mercado Pago)", () => {
      beforeEach(() => {
        gateways.active = createGateway({
          isConfigured: true,
          createCharge: jest.fn().mockResolvedValue({
            id: "12345",
            status: "pending",
            cobranca: {
              pixCopiaECola: "00020126580014br.gov.bcb.pix...",
              qrCodeBase64: "iVBORw0KGgo...",
              mercadoPagoId: "12345",
            },
          }),
        });
      });

      it("should generate a PIX charge via the active gateway and persist externalRef", async () => {
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
          serviceOrder: { clientId: userId },
        });
        prisma.payment.updateMany
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 });

        const result = await service.generateCharge(userId, "payment-1");

        expect(gateways.active.createCharge).toHaveBeenCalledWith({
          amount: 150,
          externalReference: "payment-1",
          method: PaymentMethod.PIX,
          description: "Pedido payment-1",
        });
        expect(prisma.payment.updateMany).toHaveBeenNthCalledWith(1, {
          where: { id: "payment-1", externalRef: null },
          data: { externalRef: expect.any(String) },
        });
        expect(prisma.payment.updateMany).toHaveBeenNthCalledWith(2, {
          where: { id: "payment-1", externalRef: expect.any(String) },
          data: { externalRef: "12345" },
        });
        expect(result).toEqual({
          paymentId: "payment-1",
          chargeRef: "12345",
          status: "PENDING",
          cobranca: {
            pixCopiaECola: "00020126580014br.gov.bcb.pix...",
            qrCodeBase64: "iVBORw0KGgo...",
            mercadoPagoId: "12345",
          },
        });
      });

      it("should keep the mock for credit card even with a configured gateway", async () => {
        (gateways.mock.createCharge as jest.Mock).mockResolvedValue({
          id: "chg_mock_payment2",
          status: "PENDING",
          cobranca: { linkCheckout: "https://checkout.mock.pode-deixar.com/x" },
        });
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-2",
          method: PaymentMethod.CREDIT_CARD,
          status: "PENDING",
          amount: 80,
          serviceOrder: { clientId: userId },
        });
        prisma.payment.updateMany
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 });

        const result = await service.generateCharge(userId, "payment-2");

        expect(gateways.active.createCharge).not.toHaveBeenCalled();
        expect(gateways.mock.createCharge).toHaveBeenCalled();
        expect(result.chargeRef).toMatch(/^chg_mock_/);
      });
    });
  });

  describe("getStatus", () => {
    const fullPayment = {
      id: "payment-1",
      serviceOrderId: "order-1",
      amount: 150,
      currency: "BRL",
      method: "PIX",
      status: "PAID",
      externalRef: "tx_mock_123",
      paidAt: new Date("2026-08-08T12:30:00.000Z"),
      createdAt: new Date("2026-08-08T10:00:00.000Z"),
      serviceOrder: { clientId: userId },
    };

    it("should return the payment status", async () => {
      prisma.payment.findUnique.mockResolvedValue(fullPayment);

      const result = await service.getStatus(userId, "payment-1");

      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        include: { serviceOrder: { select: { clientId: true } } },
      });
      expect(result).toEqual({
        paymentId: "payment-1",
        serviceOrderId: "order-1",
        status: "PAID",
        method: "PIX",
        amount: 150,
        currency: "BRL",
        externalRef: "tx_mock_123",
        paidAt: fullPayment.paidAt,
        createdAt: fullPayment.createdAt,
      });
    });

    it("should throw ForbiddenException when the payment does not belong to the client", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        serviceOrder: { clientId: "outro-usuario" },
      });

      await expect(service.getStatus(userId, "payment-1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException when the payment does not exist", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.getStatus(userId, "payment-99")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("confirmPayment (webhook mock)", () => {
    const dto = {
      paymentId: "payment-1",
      externalId: "tx_mock_123",
      amount: 150,
      eventId: "evt_mock_1",
      timestamp: String(Math.floor(Date.now() / 1000)),
    };

    beforeEach(() => {
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue({});
      prisma.paymentStatusHistory.create.mockResolvedValue({});
      prisma.payment.update.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        externalRef: "tx_mock_123",
      });
    });

    it("should mark as PAID and record a unique event_id", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: new Date("2026-08-20T14:00:00.000Z") },
      });
      prisma.payment.update.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        externalRef: "tx_mock_123",
      });

      const result = await service.confirmPayment(dto);

      expect(prisma.paymentWebhookEvent.findUnique).toHaveBeenCalledWith({
        where: { gateway_eventId: { gateway: "MOCK", eventId: "evt_mock_1" } },
      });
      expect(prisma.paymentWebhookEvent.create).toHaveBeenCalledWith({
        data: {
          gateway: "MOCK",
          eventId: "evt_mock_1",
          paymentId: "payment-1",
          payload: { externalId: "tx_mock_123" },
        },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: {
          status: "PAID",
          paidAt: expect.any(Date),
          externalRef: "tx_mock_123",
        },
      });
      expect(result.payment.status).toBe("PAID");
    });

    it("should be idempotent: not reprocess an already recorded event", async () => {
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        eventId: "evt_mock_1",
        paymentId: "payment-1",
      });
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        amount: 150,
      });

      const result = await service.confirmPayment(dto);

      expect(result.payment.status).toBe("PAID");
      expect(result.notice).toContain("duplicado");
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });

    it("should return a duplicate-event response when event_id already exists (concurrency)", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: new Date("2026-08-20T14:00:00.000Z") },
      });

      const p2002Error = new Error("Unique constraint failed");
      (p2002Error as any).code = "P2002";
      prisma.paymentWebhookEvent.create.mockRejectedValue(p2002Error);

      const result = await service.confirmPayment(dto);

      expect(result.notice).toContain("duplicado");
      expect(result.payment.status).toBe("PENDING");
      // Claim-first: no mutation when the claim loses.
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("should reject with a generic message without leaking the reason (oracle)", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        "Webhook rejeitado",
      );
    });

    it("should throw BadRequestException when the amount does not match", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
      });

      await expect(
        service.confirmPayment({ ...dto, amount: 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when the payment does not exist", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException on invalid transition (cancelled payment)", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "CANCELLED",
        amount: 150,
      });

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("should reject PAID (fail-closed) when the order has no appointment", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: null },
      });

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });
  });

  describe("handleGatewayWebhook", () => {
    const eventId = "evt_mp_1";
    let gateway: PaymentGateway;

    const headers = { "x-request-id": eventId };

    const dto = {
      type: "payment",
      action: "payment.updated",
      data: { id: "12345" },
    };

    beforeEach(() => {
      gateway = createGateway({
        getPayment: jest.fn(),
        extractEventId: jest.fn().mockReturnValue(eventId),
        extractGatewayPaymentId: jest.fn().mockReturnValue("12345"),
        translateStatus: jest.fn().mockReturnValue("PAID"),
      });
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue({});
      prisma.paymentStatusHistory.create.mockResolvedValue({});
    });

    it("should update the payment to PAID when the gateway returns approved", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
      (gateway.translateStatus as jest.Mock).mockReturnValue("PAID");
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: new Date("2026-08-20T14:00:00.000Z") },
      });
      prisma.payment.update.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
      });

      const result = await service.handleGatewayWebhook(gateway, headers, dto);

      expect(gateway.extractGatewayPaymentId).toHaveBeenCalledWith(dto);
      expect(gateway.getPayment).toHaveBeenCalledWith("12345");
      expect(prisma.paymentWebhookEvent.findUnique).toHaveBeenCalledWith({
        where: {
          gateway_eventId: {
            gateway: "MERCADO_PAGO",
            eventId: "evt_mp_1",
          },
        },
      });
      expect(prisma.paymentWebhookEvent.create).toHaveBeenCalledWith({
        data: {
          gateway: "MERCADO_PAGO",
          eventId: "evt_mp_1",
          paymentId: "payment-1",
          payload: {
            gatewayId: "12345",
            statusGateway: "PAID",
            gatewayStatus: "approved",
          },
        },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: {
          status: "PAID",
          paidAt: expect.any(Date),
          externalRef: "12345",
        },
      });
      expect(result.payment.status).toBe("PAID");
    });

    it("should throw ForbiddenException when the signature is invalid", async () => {
      (gateway.validateWebhook as jest.Mock).mockReturnValue(false);

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(ForbiddenException);
      expect(gateway.getPayment).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("should be idempotent: not reprocess an already recorded event", async () => {
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        eventId: "evt_mp_1",
        paymentId: "payment-1",
      });
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        amount: 150,
      });

      const result = await service.handleGatewayWebhook(gateway, headers, dto);

      expect(result.payment.status).toBe("PAID");
      expect(result.notice).toContain("idempotente");
      expect(gateway.getPayment).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the gateway amount does not match", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 1,
        externalReference: "payment-1",
      });
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
      });

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("should apply the gateway-translated status (rejected -> FAILED)", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "rejected",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
      (gateway.translateStatus as jest.Mock).mockReturnValue("FAILED");
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
      });
      prisma.payment.update.mockResolvedValue({
        id: "payment-1",
        status: "FAILED",
      });

      const result = await service.handleGatewayWebhook(
        gateway,
        headers,
        dto,
      );

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: {
          status: "FAILED",
          paidAt: null,
          externalRef: "12345",
        },
      });
      expect(result.payment.status).toBe("FAILED");
    });

    it("should throw NotFoundException when the local payment does not exist", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-inexistente",
      });
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException on invalid transition (cancelled -> paid)", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "CANCELLED",
        amount: 150,
      });

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("should reject PAID (fail-closed) when the order has no appointment", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: null },
      });

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });
  });

  describe("Provider finances", () => {
    const providerId = "provider-1";

    const now = new Date();
    const previousMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15),
    );
    const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    function createPayment(overrides: Record<string, unknown> = {}) {
      return {
        id: "payment-1",
        serviceOrderId: "order-1",
        amount: 350,
        status: "PAID",
        method: "PIX",
        feeRate: 0.1,
        feeAmount: 35,
        netAmount: 315,
        paidAt: now,
        createdAt: now,
        ...overrides,
      };
    }

    describe("getProviderFinanceSummary", () => {
      it("should compute pending, receivable and current month from the payments", async () => {
        prisma.payment.findMany.mockResolvedValue([
          createPayment({ id: "payment-pendente", amount: 150, feeRate: null, feeAmount: null, netAmount: null, status: "PENDING", paidAt: null }),
          createPayment({ id: "payment-paid-atual", paidAt: now }),
          createPayment({ id: "payment-paid-anterior", amount: 200, feeAmount: 20, netAmount: 180, paidAt: previousMonth }),
        ]);

        const result = await service.getProviderFinanceSummary(providerId);

        expect(prisma.payment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              serviceOrder: expect.objectContaining({
                proposals: {
                  some: { providerId, status: "ACCEPTED" },
                },
              }),
            }),
          }),
        );
        expect(result).toEqual({
          currency: "BRL",
          feeRate: 0.1,
          pendingNet: 135,
          grossToReceive: 550,
          feesOnToReceive: 55,
          toReceiveNet: 495,
          receivedThisMonthNet: 315,
          feesThisMonth: 35,
        });
      });

      it("should return zeros when no payments are linked", async () => {
        prisma.payment.findMany.mockResolvedValue([]);

        const result = await service.getProviderFinanceSummary(providerId);

        expect(result).toEqual({
          currency: "BRL",
          feeRate: 0.1,
          pendingNet: 0,
          grossToReceive: 0,
          feesOnToReceive: 0,
          toReceiveNet: 0,
          receivedThisMonthNet: 0,
          feesThisMonth: 0,
        });
      });
    });

    describe("getProviderFinanceItems", () => {
      it("should list items linked to the provider's accepted proposal", async () => {
        prisma.proposal.findMany.mockResolvedValue([
          { id: "proposal-1", serviceOrderId: "order-1" },
          { id: "proposal-2", serviceOrderId: "order-2" },
        ]);
        prisma.payment.findMany.mockResolvedValue([
          createPayment({ id: "payment-1", serviceOrderId: "order-1" }),
          createPayment({ id: "payment-2", serviceOrderId: "order-2", amount: 100, feeAmount: 10, netAmount: 90 }),
        ]);

        const result = await service.getProviderFinanceItems(providerId);

        expect(prisma.payment.findMany).toHaveBeenCalledWith({
          where: {
            serviceOrderId: { in: ["order-1", "order-2"] },
          },
          orderBy: { createdAt: "desc" },
        });
        expect(result).toEqual([
          expect.objectContaining({
            paymentId: "payment-1",
            proposalId: "proposal-1",
            serviceOrderId: "order-1",
            paymentStatus: "PAID",
            method: "PIX",
            grossAmount: 350,
            feeAmount: 35,
            netAmount: 315,
            feeRate: 0.1,
            paidAt: now,
            createdAt: now,
          }),
          expect.objectContaining({
            paymentId: "payment-2",
            proposalId: "proposal-2",
            grossAmount: 100,
            feeAmount: 10,
            netAmount: 90,
          }),
        ]);
      });

      it("should apply the given status filter", async () => {
        prisma.proposal.findMany.mockResolvedValue([
          { id: "proposal-1", serviceOrderId: "order-1" },
        ]);
        prisma.payment.findMany.mockResolvedValue([
          createPayment({ id: "payment-1", status: "PENDING", paidAt: null }),
        ]);

        await service.getProviderFinanceItems(providerId, "PENDING");

        expect(prisma.payment.findMany).toHaveBeenCalledWith({
          where: {
            serviceOrderId: { in: ["order-1"] },
            status: "PENDING",
          },
          orderBy: { createdAt: "desc" },
        });
      });

      it("should compute fee and net for legacy payments without persisted values", async () => {
        prisma.proposal.findMany.mockResolvedValue([
          { id: "proposal-1", serviceOrderId: "order-1" },
        ]);
        prisma.payment.findMany.mockResolvedValue([
          createPayment({ feeRate: null, feeAmount: null, netAmount: null }),
        ]);

        const result = await service.getProviderFinanceItems(providerId);

        expect(result[0]).toEqual(
          expect.objectContaining({ feeAmount: 35, netAmount: 315, feeRate: 0.1 }),
        );
      });

      it("should return an empty list when the provider has no accepted proposal", async () => {
        prisma.proposal.findMany.mockResolvedValue([]);

        const result = await service.getProviderFinanceItems(providerId);

        expect(result).toEqual([]);
        expect(prisma.payment.findMany).not.toHaveBeenCalled();
      });
    });

    describe("getProviderFinanceChart", () => {
      it("should group by month and fill empty months with zeros", async () => {
        prisma.payment.findMany.mockResolvedValue([
          createPayment({ id: "payment-1", paidAt: now }),
          createPayment({ id: "payment-2", amount: 200, feeAmount: 20, netAmount: 180, paidAt: previousMonth }),
        ]);

        const result = await service.getProviderFinanceChart(providerId, 6);

        expect(prisma.payment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: "PAID",
              serviceOrder: expect.objectContaining({
                proposals: { some: { providerId, status: "ACCEPTED" } },
              }),
            }),
          }),
        );
        expect(result).toHaveLength(6);
        expect(result[result.length - 1]).toEqual({
          month: currentMonthKey,
          netReceived: 315,
          feesRetained: 35,
        });
        expect(result).toContainEqual({
          month: expect.stringMatching(/^\d{4}-\d{2}$/),
          netReceived: 180,
          feesRetained: 20,
        });
      });

      it("should return only zeros when there are no payments in the period", async () => {
        prisma.payment.findMany.mockResolvedValue([]);

        const result = await service.getProviderFinanceChart(providerId, 6);

        expect(result).toHaveLength(6);
        expect(result.every((entry) => entry.netReceived === 0 && entry.feesRetained === 0)).toBe(true);
      });
    });
  });
});