import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { PaymentsService } from "../src/payments/payments.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { MercadoPagoService } from "../src/mercadopago/mercadopago.service";
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
    };
  };
  let mercadoPago: {
    isConfigured: boolean;
    createPixCharge: jest.Mock;
    getPayment: jest.Mock;
  };
  let logger: {
    logPaymentCreated: jest.Mock;
    logPaymentStatusChange: jest.Mock;
    logWebhookReceived: jest.Mock;
    logPaymentError: jest.Mock;
    logSuspiciousActivity: jest.Mock;
    logAuthenticationFailure: jest.Mock;
  };

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
      },
    };
    mercadoPago = {
      isConfigured: false,
      createPixCharge: jest.fn(),
      getPayment: jest.fn(),
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
        { provide: MercadoPagoService, useValue: mercadoPago },
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
    const dto = {
      serviceOrderId: "order-1",
      method: PaymentMethod.PIX,
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
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          serviceOrderId: "order-1",
          amount: 150,
          currency: "BRL",
          method: "PIX",
          status: "PENDING",
        },
      });
      expect(result.amount).toBe(150);
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

      await service.create(userId, dto);

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 220 }),
        }),
      );
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
      expect(mercadoPago.createPixCharge).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    describe("sem gateway configurado (mock)", () => {
      it("deve gerar cobrança mock e persistir externalRef", async () => {
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
          serviceOrder: { clientId: userId },
        });
        prisma.payment.update.mockResolvedValue({});

        const result = await service.generateCharge(userId, "payment-1");

        expect(prisma.payment.update).toHaveBeenCalledWith({
          where: { id: "payment-1" },
          data: { externalRef: "chg_mock_payment1" },
        });
        expect(result.paymentId).toBe("payment-1");
        expect(result.chargeRef).toMatch(/^chg_mock_/);
        expect(result.status).toBe("PENDING");
        expect(result.cobranca.pixCopiaECola).toContain("br.gov.bcb.pix");
      });

      it("deve gerar link de checkout para cartão de crédito", async () => {
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-2",
          method: PaymentMethod.CREDIT_CARD,
          status: "PENDING",
          amount: 80,
          serviceOrder: { clientId: userId },
        });
        prisma.payment.update.mockResolvedValue({});

        const result = await service.generateCharge(userId, "payment-2");

        expect(
          (result.cobranca as Record<string, string>).linkCheckout,
        ).toMatch(/^https:\/\/checkout\.mock\.pode-deixar\.com\//);
      });
    });

    describe("com gateway configurado (Mercado Pago)", () => {
      beforeEach(() => {
        mercadoPago.isConfigured = true;
      });

      it("deve gerar cobrança PIX via gateway e persistir externalRef", async () => {
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
          serviceOrder: { clientId: userId },
        });
        mercadoPago.createPixCharge.mockResolvedValue({
          id: "12345",
          status: "pending",
          qrCode: "00020126580014br.gov.bcb.pix...",
          qrCodeBase64: "iVBORw0KGgo...",
        });
        prisma.payment.update.mockResolvedValue({});

        const result = await service.generateCharge(userId, "payment-1");

        expect(mercadoPago.createPixCharge).toHaveBeenCalledWith({
          amount: 150,
          externalReference: "payment-1",
          payerEmail: "sandbox@pode-deixar.com",
          notificationUrl: undefined,
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

      it("deve usar o notificationUrl configurado nas variáveis de ambiente", async () => {
        process.env.MERCADO_PAGO_NOTIFICATION_URL =
          "https://exemplo.com/api/payments/webhook/mercadopago";
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
          serviceOrder: { clientId: userId },
        });
        mercadoPago.createPixCharge.mockResolvedValue({
          id: "12345",
          status: "pending",
          qrCode: "...",
          qrCodeBase64: "...",
        });
        prisma.payment.update.mockResolvedValue({});

        await service.generateCharge(userId, "payment-1");

        expect(mercadoPago.createPixCharge).toHaveBeenCalledWith(
          expect.objectContaining({
            notificationUrl:
              "https://exemplo.com/api/payments/webhook/mercadopago",
          }),
        );
        delete process.env.MERCADO_PAGO_NOTIFICATION_URL;
      });

      it("deve manter mock para cartão de crédito mesmo com gateway configurado", async () => {
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-2",
          method: PaymentMethod.CREDIT_CARD,
          status: "PENDING",
          amount: 80,
          serviceOrder: { clientId: userId },
        });

        const result = await service.generateCharge(userId, "payment-2");

        expect(mercadoPago.createPixCharge).not.toHaveBeenCalled();
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
  });

  describe("handleMercadoPagoWebhook", () => {
    const eventId = "evt_mp_1";

    beforeEach(() => {
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue({});
      prisma.paymentStatusHistory.create.mockResolvedValue({});
    });

    it("deve atualizar o pagamento para PAID quando o gateway retorna approved", async () => {
      mercadoPago.getPayment.mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
      });
      prisma.payment.update.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
      });

      const dto = {
        type: "payment",
        action: "payment.updated",
        data: { id: "12345" },
      };
      const result = await service.handleMercadoPagoWebhook(dto, eventId);

      expect(mercadoPago.getPayment).toHaveBeenCalledWith("12345");
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

      const result = await service.handleMercadoPagoWebhook(
        {
          type: "payment",
          action: "payment.updated",
          data: { id: "12345" },
        },
        eventId,
      );

      expect(result.payment.status).toBe("PAID");
      expect(result.notice).toContain("idempotente");
      expect(mercadoPago.getPayment).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("deve lançar BadRequestException quando o valor do gateway não confere", async () => {
      mercadoPago.getPayment.mockResolvedValue({
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
        service.handleMercadoPagoWebhook(
          {
            type: "payment",
            action: "payment.updated",
            data: { id: "12345" },
          },
          eventId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("deve traduzir status rejected para FAILED", async () => {
      mercadoPago.getPayment.mockResolvedValue({
        id: "12345",
        status: "rejected",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
        amount: 150,
      });
      prisma.payment.update.mockResolvedValue({
        id: "payment-1",
        status: "FAILED",
      });

      const resultado = await service.handleMercadoPagoWebhook(
        {
          type: "payment",
          action: "payment.updated",
          data: { id: "12345" },
        },
        eventId,
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
      mercadoPago.getPayment.mockResolvedValue({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-inexistente",
      });
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleMercadoPagoWebhook(
          {
            type: "payment",
            action: "payment.updated",
            data: { id: "12345" },
          },
          eventId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("deve lançar BadRequestException na transição inválida (cancelado -> paid)", async () => {
      mercadoPago.getPayment.mockResolvedValue({
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
        service.handleMercadoPagoWebhook(
          {
            type: "payment",
            action: "payment.updated",
            data: { id: "12345" },
          },
          eventId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });
});