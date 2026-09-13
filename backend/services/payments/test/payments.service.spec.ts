import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { PaymentsService } from "../src/payments/payments.service";
import { PaymentsRepository } from "../src/payments/payments.repository";
import { PaymentGatewayFactory } from "../src/gateway/payment-gateway.factory";
import { PaymentGateway } from "../src/gateway/payment-gateway.interface";
import { PaymentLoggerService } from "../src/payments/payment-logger.service";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let repository: {
    findPaymentWithClient: jest.Mock;
    findClientPayments: jest.Mock;
    findOrderWithAcceptedProposal: jest.Mock;
    findPaymentByIdempotency: jest.Mock;
    createPayment: jest.Mock;
    claimCharge: jest.Mock;
    releaseChargeClaim: jest.Mock;
    finalizeCharge: jest.Mock;
    findPaymentWithSchedule: jest.Mock;
    findPaymentById: jest.Mock;
    findProcessedEvent: jest.Mock;
    recordStatusHistory: jest.Mock;
    applyWebhookEvent: jest.Mock;
    findAcceptedProposals: jest.Mock;
    findProviderPayments: jest.Mock;
    findPaymentsByOrderIds: jest.Mock;
    findPaidPaymentsSince: jest.Mock;
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
    repository = {
      findPaymentWithClient: jest.fn(),
      findClientPayments: jest.fn(),
      findOrderWithAcceptedProposal: jest.fn(),
      findPaymentByIdempotency: jest.fn(),
      createPayment: jest.fn(),
      claimCharge: jest.fn(),
      releaseChargeClaim: jest.fn(),
      finalizeCharge: jest.fn(),
      findPaymentWithSchedule: jest.fn(),
      findPaymentById: jest.fn(),
      findProcessedEvent: jest.fn(),
      recordStatusHistory: jest.fn(),
      applyWebhookEvent: jest.fn(),
      findAcceptedProposals: jest.fn(),
      findProviderPayments: jest.fn(),
      findPaymentsByOrderIds: jest.fn(),
      findPaidPaymentsSince: jest.fn(),
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
        { provide: PaymentsRepository, useValue: repository },
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
      repository.findClientPayments.mockResolvedValue(payments);

      const result = await service.findAll(userId);

      expect(repository.findClientPayments).toHaveBeenCalledWith(userId);
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
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      repository.findPaymentByIdempotency.mockResolvedValue(null);
      repository.createPayment.mockResolvedValue({
        id: "payment-1",
        serviceOrderId: "order-1",
        amount: 150,
        currency: "BRL",
        method: "PIX",
        status: "PENDING",
      });

      const result = await service.create(userId, dto);

      expect(repository.findOrderWithAcceptedProposal).toHaveBeenCalledWith(
        "order-1",
      );
      expect(repository.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceOrderId: "order-1",
          amount: 150,
          currency: "BRL",
          method: "PIX",
          feeRate: 0.1,
          feeAmount: 15,
          netAmount: 135,
          // Key generated in code when the client omits it.
          idempotencyKey: expect.any(String),
          scheduledAt: new Date(scheduledAt),
          scheduledEndAt: null,
        }),
      );
      expect(result).toEqual(expect.objectContaining({ amount: 150 }));
    });

    it("should persist the platform fee configured in PLATFORM_FEE_RATE", async () => {
      process.env.PLATFORM_FEE_RATE = "0.2";
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      repository.findPaymentByIdempotency.mockResolvedValue(null);
      repository.createPayment.mockResolvedValue({
        id: "payment-1",
        amount: 150,
      });

      await service.create(userId, dto);

      expect(repository.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          feeRate: 0.2,
          feeAmount: 30,
          netAmount: 120,
        }),
      );
      delete process.env.PLATFORM_FEE_RATE;
    });

    it("should use the accepted proposal price when there is no agreedPrice", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: null,
        proposals: [{ id: "proposal-1", price: 220 }],
      });
      repository.findPaymentByIdempotency.mockResolvedValue(null);
      repository.createPayment.mockResolvedValue({
        id: "payment-1",
        amount: 220,
      });

      await service.create(userId, dto);

      expect(repository.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 220,
        }),
      );
    });

    it("should store the schedule end when provided", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      repository.findPaymentByIdempotency.mockResolvedValue(null);
      repository.createPayment.mockResolvedValue({ id: "payment-1", amount: 150 });

      await service.create(userId, {
        ...dto,
        scheduledEndAt: "2026-08-20T17:00:00.000Z",
      });

      expect(repository.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledAt: new Date(scheduledAt),
          scheduledEndAt: new Date("2026-08-20T17:00:00.000Z"),
        }),
      );
    });

    it("should throw BadRequestException when the end is before the start", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
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
      expect(repository.createPayment).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when the order does not exist", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when the order does not belong to the client", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: "outro-usuario",
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.createPayment).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the order has no price set", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
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
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "CANCELLED",
        agreedPrice: 150,
        proposals: [],
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.createPayment).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the order amount is invalid", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 0,
        proposals: [],
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.createPayment).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the currency is not supported", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });

      await expect(
        service.create(userId, { ...dto, currency: "USD" as any }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.createPayment).not.toHaveBeenCalled();
    });

    it("should persist the currency and idempotency key when provided", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      repository.findPaymentByIdempotency.mockResolvedValue(null);
      repository.createPayment.mockResolvedValue({ id: "payment-1" });

      await service.create(userId, {
        ...dto,
        currency: "BRL",
        idempotencyKey: "chave-123",
      });

      expect(repository.findPaymentByIdempotency).toHaveBeenCalledWith(
        "order-1",
        "chave-123",
      );
      expect(repository.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: "BRL",
          idempotencyKey: "chave-123",
        }),
      );
    });

    it("should return the existing payment when the idempotency key was already used", async () => {
      repository.findOrderWithAcceptedProposal.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      const existingPayment = { id: "payment-existing", status: "PENDING" };
      repository.findPaymentByIdempotency.mockResolvedValue(existingPayment);

      const result = await service.create(userId, {
        ...dto,
        idempotencyKey: "chave-repetida",
      });

      expect(result).toEqual(existingPayment);
      expect(repository.createPayment).not.toHaveBeenCalled();
    });
  });

  describe("generateCharge", () => {
    it("should throw NotFoundException when the payment does not exist", async () => {
      repository.findPaymentWithClient.mockResolvedValue(null);

      await expect(
        service.generateCharge(userId, "payment-x"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when the payment does not belong to the client", async () => {
      repository.findPaymentWithClient.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        serviceOrder: { clientId: "outro-usuario" },
      });

      await expect(
        service.generateCharge(userId, "payment-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when the payment is not pending", async () => {
      repository.findPaymentWithClient.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        serviceOrder: { clientId: userId },
      });

      await expect(
        service.generateCharge(userId, "payment-1"),
      ).rejects.toThrow(BadRequestException);
      expect(repository.claimCharge).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the charge was already generated (externalRef present)", async () => {
      repository.findPaymentWithClient.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        externalRef: "chg_anterior",
        serviceOrder: { clientId: userId },
      });

      await expect(
        service.generateCharge(userId, "payment-1"),
      ).rejects.toThrow(BadRequestException);
      expect(gateways.active.createCharge).not.toHaveBeenCalled();
      expect(repository.claimCharge).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the atomic claim loses the race", async () => {
      repository.findPaymentWithClient.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        externalRef: null,
        method: PaymentMethod.PIX,
        amount: 150,
        serviceOrder: { clientId: userId },
      });
      repository.claimCharge.mockResolvedValue({ count: 0 });

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
        repository.findPaymentWithClient.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
          serviceOrder: { clientId: userId },
        });
        repository.claimCharge.mockResolvedValue({ count: 1 });
        repository.finalizeCharge.mockResolvedValue({ count: 1 });

        const result = await service.generateCharge(userId, "payment-1");

        expect(gateways.active.createCharge).toHaveBeenCalledWith({
          amount: 150,
          externalReference: "payment-1",
          method: PaymentMethod.PIX,
          description: "Pedido payment-1",
        });
        expect(repository.claimCharge).toHaveBeenCalledWith(
          "payment-1",
          expect.any(String),
        );
        expect(repository.finalizeCharge).toHaveBeenCalledWith(
          "payment-1",
          expect.any(String),
          "chg_mock_payment1",
        );
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
        repository.findPaymentWithClient.mockResolvedValue({
          id: "payment-2",
          method: PaymentMethod.CREDIT_CARD,
          status: "PENDING",
          amount: 80,
          serviceOrder: { clientId: userId },
        });
        repository.claimCharge.mockResolvedValue({ count: 1 });
        repository.finalizeCharge.mockResolvedValue({ count: 1 });

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
        repository.findPaymentWithClient.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
          serviceOrder: { clientId: userId },
        });
        repository.claimCharge.mockResolvedValue({ count: 1 });
        repository.finalizeCharge.mockResolvedValue({ count: 1 });

        const result = await service.generateCharge(userId, "payment-1");

        expect(gateways.active.createCharge).toHaveBeenCalledWith({
          amount: 150,
          externalReference: "payment-1",
          method: PaymentMethod.PIX,
          description: "Pedido payment-1",
        });
        expect(repository.claimCharge).toHaveBeenCalledWith(
          "payment-1",
          expect.any(String),
        );
        expect(repository.finalizeCharge).toHaveBeenCalledWith(
          "payment-1",
          expect.any(String),
          "12345",
        );
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
        repository.findPaymentWithClient.mockResolvedValue({
          id: "payment-2",
          method: PaymentMethod.CREDIT_CARD,
          status: "PENDING",
          amount: 80,
          serviceOrder: { clientId: userId },
        });
        repository.claimCharge.mockResolvedValue({ count: 1 });
        repository.finalizeCharge.mockResolvedValue({ count: 1 });

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
      repository.findPaymentWithClient.mockResolvedValue(fullPayment);

      const result = await service.getStatus(userId, "payment-1");

      expect(repository.findPaymentWithClient).toHaveBeenCalledWith(
        "payment-1",
      );
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
      repository.findPaymentWithClient.mockResolvedValue({
        id: "payment-1",
        serviceOrder: { clientId: "outro-usuario" },
      });

      await expect(service.getStatus(userId, "payment-1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException when the payment does not exist", async () => {
      repository.findPaymentWithClient.mockResolvedValue(null);

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
      repository.findProcessedEvent.mockResolvedValue(null);
      repository.recordStatusHistory.mockResolvedValue({});
      repository.findPaymentById.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        externalRef: "tx_mock_123",
      });
      repository.applyWebhookEvent.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        externalRef: "tx_mock_123",
      });
    });

    it("should mark as PAID and record a unique event_id", async () => {
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: new Date("2026-08-20T14:00:00.000Z") },
      });
      repository.applyWebhookEvent.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        externalRef: "tx_mock_123",
      });

      const result = await service.confirmPayment(dto);

      expect(repository.findProcessedEvent).toHaveBeenCalledWith(
        "MOCK",
        "evt_mock_1",
      );
      expect(repository.applyWebhookEvent).toHaveBeenCalledWith(
        {
          gateway: "MOCK",
          eventId: "evt_mock_1",
          paymentId: "payment-1",
          payload: { externalId: "tx_mock_123" },
        },
        {
          paymentId: "payment-1",
          status: "PAID",
          paidAt: expect.any(Date),
          externalRef: "tx_mock_123",
        },
      );
      expect(result.payment.status).toBe("PAID");
    });

    it("should be idempotent: not reprocess an already recorded event", async () => {
      repository.findProcessedEvent.mockResolvedValue({
        eventId: "evt_mock_1",
        paymentId: "payment-1",
      });
      repository.findPaymentById.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        amount: 150,
      });

      const result = await service.confirmPayment(dto);

      expect(result.payment.status).toBe("PAID");
      expect(result.notice).toContain("duplicado");
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
      expect(repository.recordStatusHistory).not.toHaveBeenCalled();
    });

    it("should return a duplicate-event response when event_id already exists (concurrency)", async () => {
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: new Date("2026-08-20T14:00:00.000Z") },
      });
      repository.findPaymentById.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
      });

      const p2002Error = new Error("Unique constraint failed");
      (p2002Error as any).code = "P2002";
      repository.applyWebhookEvent.mockRejectedValue(p2002Error);

      const result = await service.confirmPayment(dto);

      expect(result.notice).toContain("duplicado");
      expect(result.payment.status).toBe("PENDING");
      // Claim-first: no status history when the claim loses.
      expect(repository.recordStatusHistory).not.toHaveBeenCalled();
    });

    it("should reject with a generic message without leaking the reason (oracle)", async () => {
      repository.findPaymentWithSchedule.mockResolvedValue(null);

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        "Webhook rejeitado",
      );
    });

    it("should throw BadRequestException when the amount does not match", async () => {
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
      });

      await expect(
        service.confirmPayment({ ...dto, amount: 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when the payment does not exist", async () => {
      repository.findPaymentWithSchedule.mockResolvedValue(null);

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException on invalid transition (cancelled payment)", async () => {
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "CANCELLED",
        amount: 150,
      });

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
    });

    it("should reject PAID (fail-closed) when the order has no appointment", async () => {
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: null },
      });

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
      expect(repository.recordStatusHistory).not.toHaveBeenCalled();
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
      repository.findProcessedEvent.mockResolvedValue(null);
      repository.recordStatusHistory.mockResolvedValue({});
      repository.findPaymentById.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
      });
      repository.applyWebhookEvent.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
      });
    });

    it("should update the payment to PAID when the gateway returns approved", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
      (gateway.translateStatus as jest.Mock).mockReturnValue("PAID");
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: new Date("2026-08-20T14:00:00.000Z") },
      });
      repository.applyWebhookEvent.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
      });

      const result = await service.handleGatewayWebhook(gateway, headers, dto);

      expect(gateway.extractGatewayPaymentId).toHaveBeenCalledWith(dto);
      expect(gateway.getPayment).toHaveBeenCalledWith("12345");
      expect(repository.findProcessedEvent).toHaveBeenCalledWith(
        "MERCADO_PAGO",
        "evt_mp_1",
      );
      expect(repository.applyWebhookEvent).toHaveBeenCalledWith(
        {
          gateway: "MERCADO_PAGO",
          eventId: "evt_mp_1",
          paymentId: "payment-1",
          payload: {
            gatewayId: "12345",
            statusGateway: "PAID",
            gatewayStatus: "approved",
          },
        },
        {
          paymentId: "payment-1",
          status: "PAID",
          paidAt: expect.any(Date),
          externalRef: "12345",
        },
      );
      expect(result.payment.status).toBe("PAID");
    });

    it("should throw ForbiddenException when the signature is invalid", async () => {
      (gateway.validateWebhook as jest.Mock).mockReturnValue(false);

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(ForbiddenException);
      expect(gateway.getPayment).not.toHaveBeenCalled();
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
    });

    it("should be idempotent: not reprocess an already recorded event", async () => {
      repository.findProcessedEvent.mockResolvedValue({
        eventId: "evt_mp_1",
        paymentId: "payment-1",
      });
      repository.findPaymentById.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        amount: 150,
      });

      const result = await service.handleGatewayWebhook(gateway, headers, dto);

      expect(result.payment.status).toBe("PAID");
      expect(result.notice).toContain("idempotente");
      expect(gateway.getPayment).not.toHaveBeenCalled();
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when the gateway amount does not match", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 1,
        externalReference: "payment-1",
      });
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
      });

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(BadRequestException);
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
    });

    it("should apply the gateway-translated status (rejected -> FAILED)", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "rejected",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
      (gateway.translateStatus as jest.Mock).mockReturnValue("FAILED");
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
      });
      repository.applyWebhookEvent.mockResolvedValue({
        id: "payment-1",
        status: "FAILED",
      });

      const result = await service.handleGatewayWebhook(
        gateway,
        headers,
        dto,
      );

      expect(repository.applyWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: "payment-1" }),
        expect.objectContaining({
          paymentId: "payment-1",
          status: "FAILED",
          paidAt: null,
          externalRef: "12345",
        }),
      );
      expect(result.payment.status).toBe("FAILED");
    });

    it("should throw NotFoundException when the local payment does not exist", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-inexistente",
      });
      repository.findPaymentWithSchedule.mockResolvedValue(null);

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
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "CANCELLED",
        amount: 150,
      });

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(BadRequestException);
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
    });

    it("should reject PAID (fail-closed) when the order has no appointment", async () => {
      (gateway.getPayment as jest.Mock).mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
      repository.findPaymentWithSchedule.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: null },
      });

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(BadRequestException);
      expect(repository.applyWebhookEvent).not.toHaveBeenCalled();
      expect(repository.recordStatusHistory).not.toHaveBeenCalled();
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
        repository.findProviderPayments.mockResolvedValue([
          createPayment({ id: "payment-pendente", amount: 150, feeRate: null, feeAmount: null, netAmount: null, status: "PENDING", paidAt: null }),
          createPayment({ id: "payment-paid-atual", paidAt: now }),
          createPayment({ id: "payment-paid-anterior", amount: 200, feeAmount: 20, netAmount: 180, paidAt: previousMonth }),
        ]);

        const result = await service.getProviderFinanceSummary(providerId);

        expect(repository.findProviderPayments).toHaveBeenCalledWith(
          providerId,
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
        repository.findProviderPayments.mockResolvedValue([]);

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
        repository.findAcceptedProposals.mockResolvedValue([
          { id: "proposal-1", serviceOrderId: "order-1" },
          { id: "proposal-2", serviceOrderId: "order-2" },
        ]);
        repository.findPaymentsByOrderIds.mockResolvedValue([
          createPayment({ id: "payment-1", serviceOrderId: "order-1" }),
          createPayment({ id: "payment-2", serviceOrderId: "order-2", amount: 100, feeAmount: 10, netAmount: 90 }),
        ]);

        const result = await service.getProviderFinanceItems(providerId);

        expect(repository.findAcceptedProposals).toHaveBeenCalledWith(
          providerId,
        );
        expect(repository.findPaymentsByOrderIds).toHaveBeenCalledWith(
          ["order-1", "order-2"],
          undefined,
        );
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
        repository.findAcceptedProposals.mockResolvedValue([
          { id: "proposal-1", serviceOrderId: "order-1" },
        ]);
        repository.findPaymentsByOrderIds.mockResolvedValue([
          createPayment({ id: "payment-1", status: "PENDING", paidAt: null }),
        ]);

        await service.getProviderFinanceItems(providerId, "PENDING");

        expect(repository.findPaymentsByOrderIds).toHaveBeenCalledWith(
          ["order-1"],
          "PENDING",
        );
      });

      it("should compute fee and net for legacy payments without persisted values", async () => {
        repository.findAcceptedProposals.mockResolvedValue([
          { id: "proposal-1", serviceOrderId: "order-1" },
        ]);
        repository.findPaymentsByOrderIds.mockResolvedValue([
          createPayment({ feeRate: null, feeAmount: null, netAmount: null }),
        ]);

        const result = await service.getProviderFinanceItems(providerId);

        expect(result[0]).toEqual(
          expect.objectContaining({ feeAmount: 35, netAmount: 315, feeRate: 0.1 }),
        );
      });

      it("should return an empty list when the provider has no accepted proposal", async () => {
        repository.findAcceptedProposals.mockResolvedValue([]);

        const result = await service.getProviderFinanceItems(providerId);

        expect(result).toEqual([]);
        expect(repository.findPaymentsByOrderIds).not.toHaveBeenCalled();
      });
    });

    describe("getProviderFinanceChart", () => {
      it("should group by month and fill empty months with zeros", async () => {
        repository.findPaidPaymentsSince.mockResolvedValue([
          createPayment({ id: "payment-1", paidAt: now }),
          createPayment({ id: "payment-2", amount: 200, feeAmount: 20, netAmount: 180, paidAt: previousMonth }),
        ]);

        const result = await service.getProviderFinanceChart(providerId, 6);

        expect(repository.findPaidPaymentsSince).toHaveBeenCalledWith(
          providerId,
          expect.any(Date),
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
        repository.findPaidPaymentsSince.mockResolvedValue([]);

        const result = await service.getProviderFinanceChart(providerId, 6);

        expect(result).toHaveLength(6);
        expect(result.every((entry) => entry.netReceived === 0 && entry.feesRetained === 0)).toBe(true);
      });
    });
  });
});
