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

  function criarGateway(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
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
      $transaction: jest.fn(async (operacoes: any[]) =>
        Promise.all(operacoes),
      ),
    };
    gateways = {
      active: criarGateway(),
      mock: criarGateway({ name: "MOCK" }),
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

  it("deve ser definido", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("deve filtrar pagamentos do cliente autenticado", async () => {
      const pagamentos = [
        {
          id: "payment-1",
          serviceOrderId: "order-1",
          amount: 150.5,
          method: "PIX",
          status: "PAID",
        },
      ];
      prisma.payment.findMany.mockResolvedValue(pagamentos);

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
      expect(result).toEqual(pagamentos);
    });
  });

  describe("create", () => {
    const scheduledAt = "2026-08-20T14:00:00.000Z";

    const dto = {
      serviceOrderId: "order-1",
      method: PaymentMethod.PIX,
      scheduledAt,
    };

    it("deve registrar transação com preço vindo do pedido", async () => {
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
        },
      });
      expect(result).toEqual(expect.objectContaining({ amount: 150 }));
    });

    it("deve persistir a taxa da plataforma configurada em PLATFORM_FEE_RATE", async () => {
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

    it("deve usar o preço da proposta aceita quando não há agreedPrice", async () => {
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

    it("deve gravar o término do agendamento quando informado", async () => {
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

    it("deve lançar BadRequestException quando o término é anterior ao início", async () => {
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

    it("deve lançar NotFoundException quando o pedido não existe", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("deve lançar ForbiddenException quando o pedido não pertence ao cliente", async () => {
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

    it("deve lançar BadRequestException quando o pedido não tem preço definido", async () => {
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

    it("deve lançar BadRequestException quando o pedido está cancelado", async () => {
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

    it("deve lançar BadRequestException quando o valor do pedido é inválido", async () => {
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

    it("deve lançar BadRequestException quando a moeda não é suportada", async () => {
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

    it("deve gravar a moeda e a chave de idempotência quando informadas", async () => {
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

    it("deve retornar o pagamento existente quando a chave de idempotência já foi usada", async () => {
      prisma.serviceOrder.findUnique.mockResolvedValue({
        id: "order-1",
        clientId: userId,
        status: "IN_PROGRESS",
        agreedPrice: 150,
        proposals: [],
      });
      const pagamentoExistente = { id: "payment-existing", status: "PENDING" };
      prisma.payment.findFirst.mockResolvedValue(pagamentoExistente);

      const result = await service.create(userId, {
        ...dto,
        idempotencyKey: "chave-repetida",
      });

      expect(result).toEqual(pagamentoExistente);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe("generateCharge", () => {
    it("deve lançar NotFoundException quando o pagamento não existe", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.generateCharge(userId, "payment-x"),
      ).rejects.toThrow(NotFoundException);
    });

    it("deve lançar ForbiddenException quando o pagamento não pertence ao cliente", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        serviceOrder: { clientId: "outro-usuario" },
      });

      await expect(
        service.generateCharge(userId, "payment-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("deve lançar BadRequestException quando o pagamento não está pendente", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        serviceOrder: { clientId: userId },
      });

      await expect(
        service.generateCharge(userId, "payment-1"),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("deve lançar BadRequestException quando a cobrança já foi gerada (externalRef presente)", async () => {
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
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    describe("sem gateway configurado (mock ativo)", () => {
      beforeEach(() => {
        gateways.active = criarGateway({
          name: "MOCK",
          isConfigured: true,
          createCharge: jest.fn().mockResolvedValue({
            id: "chg_mock_payment1",
            status: "PENDING",
            cobranca: { pixCopiaECola: "00020126580014br.gov.bcb.pix..." },
          }),
        });
      });

      it("deve gerar cobrança via gateway ativo e persistir externalRef", async () => {
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
          serviceOrder: { clientId: userId },
        });
        prisma.payment.update.mockResolvedValue({});

        const result = await service.generateCharge(userId, "payment-1");

        expect(gateways.active.createCharge).toHaveBeenCalledWith({
          amount: 150,
          externalReference: "payment-1",
          method: PaymentMethod.PIX,
          description: "Pedido payment-1",
        });
        expect(prisma.payment.update).toHaveBeenCalledWith({
          where: { id: "payment-1" },
          data: { externalRef: "chg_mock_payment1" },
        });
        expect(result).toEqual({
          paymentId: "payment-1",
          chargeRef: "chg_mock_payment1",
          status: "PENDING",
          cobranca: { pixCopiaECola: "00020126580014br.gov.bcb.pix..." },
        });
      });

      it("deve gerar link de checkout para cartão de crédito via gateway mock", async () => {
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
        prisma.payment.update.mockResolvedValue({});

        const result = await service.generateCharge(userId, "payment-2");

        expect(gateways.mock.createCharge).toHaveBeenCalled();
        expect(
          (result.cobranca as Record<string, string>).linkCheckout,
        ).toMatch(/^https:\/\/checkout\.mock\.pode-deixar\.com\//);
      });
    });

    describe("com gateway configurado (Mercado Pago)", () => {
      beforeEach(() => {
        gateways.active = criarGateway({
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

      it("deve gerar cobrança PIX via gateway ativo e persistir externalRef", async () => {
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
          serviceOrder: { clientId: userId },
        });
        prisma.payment.update.mockResolvedValue({});

        const result = await service.generateCharge(userId, "payment-1");

        expect(gateways.active.createCharge).toHaveBeenCalledWith({
          amount: 150,
          externalReference: "payment-1",
          method: PaymentMethod.PIX,
          description: "Pedido payment-1",
        });
        expect(prisma.payment.update).toHaveBeenCalledWith({
          where: { id: "payment-1" },
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

      it("deve manter mock para cartão de crédito mesmo com gateway configurado", async () => {
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
        prisma.payment.update.mockResolvedValue({});

        const result = await service.generateCharge(userId, "payment-2");

        expect(gateways.active.createCharge).not.toHaveBeenCalled();
        expect(gateways.mock.createCharge).toHaveBeenCalled();
        expect(result.chargeRef).toMatch(/^chg_mock_/);
      });
    });
  });

  describe("getStatus", () => {
    const pagamentoCompleto = {
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

    it("deve retornar o status do pagamento", async () => {
      prisma.payment.findUnique.mockResolvedValue(pagamentoCompleto);

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
        paidAt: pagamentoCompleto.paidAt,
        createdAt: pagamentoCompleto.createdAt,
      });
    });

    it("deve lançar ForbiddenException quando o pagamento não pertence ao cliente", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        serviceOrder: { clientId: "outro-usuario" },
      });

      await expect(service.getStatus(userId, "payment-1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("deve lançar NotFoundException quando o pagamento não existe", async () => {
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
    };

    beforeEach(() => {
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue({});
      prisma.paymentStatusHistory.create.mockResolvedValue({});
    });

    it("deve marcar como PAID e registrar event_id único", async () => {
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

    it("deve ser idempotente: não reprocessar evento já registrado", async () => {
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

    it("deve retornar resposta de evento duplicado quando event_id já existe (concorrência)", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
        serviceOrder: { scheduledAt: new Date("2026-08-20T14:00:00.000Z") },
      });

      const erroP2002 = new Error("Unique constraint failed");
      (erroP2002 as any).code = "P2002";
      prisma.paymentWebhookEvent.create.mockRejectedValue(erroP2002);

      const result = await service.confirmPayment(dto);

      expect(result.notice).toContain("duplicado");
      expect(result.payment.status).toBe("PENDING");
    });

    it("deve lançar BadRequestException quando o valor não confere", async () => {
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

    it("deve lançar NotFoundException quando o pagamento não existe", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("deve lançar BadRequestException na transição inválida (pagamento cancelado)", async () => {
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

    it("deve rejeitar PAID (fail-closed) quando o pedido não tem agendamento", async () => {
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
      gateway = criarGateway({
        getPayment: jest.fn(),
        extractEventId: jest.fn().mockReturnValue(eventId),
        extractGatewayPaymentId: jest.fn().mockReturnValue("12345"),
        translateStatus: jest.fn().mockReturnValue("PAID"),
      });
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue({});
      prisma.paymentStatusHistory.create.mockResolvedValue({});
    });

    it("deve atualizar o pagamento para PAID quando o gateway retorna approved", async () => {
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

    it("deve lançar ForbiddenException quando a assinatura é inválida", async () => {
      (gateway.validateWebhook as jest.Mock).mockReturnValue(false);

      await expect(
        service.handleGatewayWebhook(gateway, headers, dto),
      ).rejects.toThrow(ForbiddenException);
      expect(gateway.getPayment).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("deve ser idempotente: não reprocessar evento já registrado", async () => {
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

    it("deve lançar BadRequestException quando o valor do gateway não confere", async () => {
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

    it("deve aplicar o status traduzido pelo gateway (rejected -> FAILED)", async () => {
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

      const resultado = await service.handleGatewayWebhook(
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
      expect(resultado.payment.status).toBe("FAILED");
    });

    it("deve lançar NotFoundException quando o pagamento local não existe", async () => {
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

    it("deve lançar BadRequestException na transição inválida (cancelado -> paid)", async () => {
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

    it("deve rejeitar PAID (fail-closed) quando o pedido não tem agendamento", async () => {
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

  describe("Financeiro do prestador", () => {
    const providerId = "provider-1";

    const agora = new Date();
    const mesAnterior = new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 1, 15),
    );
    const chaveMesAtual = `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, "0")}`;

    function criarPagamento(overrides: Record<string, unknown> = {}) {
      return {
        id: "payment-1",
        serviceOrderId: "order-1",
        amount: 350,
        status: "PAID",
        method: "PIX",
        feeRate: 0.1,
        feeAmount: 35,
        netAmount: 315,
        paidAt: agora,
        createdAt: agora,
        ...overrides,
      };
    }

    describe("getProviderFinanceSummary", () => {
      it("deve calcular pendente, a receber e mês atual a partir dos pagamentos", async () => {
        prisma.payment.findMany.mockResolvedValue([
          criarPagamento({ id: "payment-pendente", amount: 150, feeRate: null, feeAmount: null, netAmount: null, status: "PENDING", paidAt: null }),
          criarPagamento({ id: "payment-paid-atual", paidAt: agora }),
          criarPagamento({ id: "payment-paid-anterior", amount: 200, feeAmount: 20, netAmount: 180, paidAt: mesAnterior }),
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

      it("deve retornar zeros quando não há pagamentos vinculados", async () => {
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
      it("deve listar itens vinculados à proposta aceita do prestador", async () => {
        prisma.proposal.findMany.mockResolvedValue([
          { id: "proposal-1", serviceOrderId: "order-1" },
          { id: "proposal-2", serviceOrderId: "order-2" },
        ]);
        prisma.payment.findMany.mockResolvedValue([
          criarPagamento({ id: "payment-1", serviceOrderId: "order-1" }),
          criarPagamento({ id: "payment-2", serviceOrderId: "order-2", amount: 100, feeAmount: 10, netAmount: 90 }),
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
            paidAt: agora,
            createdAt: agora,
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

      it("deve aplicar o filtro de status informado", async () => {
        prisma.proposal.findMany.mockResolvedValue([
          { id: "proposal-1", serviceOrderId: "order-1" },
        ]);
        prisma.payment.findMany.mockResolvedValue([
          criarPagamento({ id: "payment-1", status: "PENDING", paidAt: null }),
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

      it("deve calcular fee e líquido para pagamentos legados sem valores persistidos", async () => {
        prisma.proposal.findMany.mockResolvedValue([
          { id: "proposal-1", serviceOrderId: "order-1" },
        ]);
        prisma.payment.findMany.mockResolvedValue([
          criarPagamento({ feeRate: null, feeAmount: null, netAmount: null }),
        ]);

        const result = await service.getProviderFinanceItems(providerId);

        expect(result[0]).toEqual(
          expect.objectContaining({ feeAmount: 35, netAmount: 315, feeRate: 0.1 }),
        );
      });

      it("deve retornar lista vazia quando o prestador não tem proposta aceita", async () => {
        prisma.proposal.findMany.mockResolvedValue([]);

        const result = await service.getProviderFinanceItems(providerId);

        expect(result).toEqual([]);
        expect(prisma.payment.findMany).not.toHaveBeenCalled();
      });
    });

    describe("getProviderFinanceChart", () => {
      it("deve agrupar por mês e preencher meses vazios com zeros", async () => {
        prisma.payment.findMany.mockResolvedValue([
          criarPagamento({ id: "payment-1", paidAt: agora }),
          criarPagamento({ id: "payment-2", amount: 200, feeAmount: 20, netAmount: 180, paidAt: mesAnterior }),
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
          month: chaveMesAtual,
          netReceived: 315,
          feesRetained: 35,
        });
        expect(result).toContainEqual({
          month: expect.stringMatching(/^\d{4}-\d{2}$/),
          netReceived: 180,
          feesRetained: 20,
        });
      });

      it("deve retornar apenas zeros quando não há pagamentos no período", async () => {
        prisma.payment.findMany.mockResolvedValue([]);

        const result = await service.getProviderFinanceChart(providerId, 6);

        expect(result).toHaveLength(6);
        expect(result.every((entry) => entry.netReceived === 0 && entry.feesRetained === 0)).toBe(true);
      });
    });
  });
});