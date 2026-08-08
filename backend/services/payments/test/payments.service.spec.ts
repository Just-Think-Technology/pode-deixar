import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { PaymentsService } from "../src/payments/payments.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { MercadoPagoService } from "../src/mercadopago/mercadopago.service";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let prisma: {
    payment: {
      findMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let mercadoPago: {
    isConfigured: boolean;
    createPixCharge: jest.Mock;
    getPayment: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      payment: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    mercadoPago = {
      isConfigured: false,
      createPixCharge: jest.fn(),
      getPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MercadoPagoService, useValue: mercadoPago },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it("deve ser definido", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("deve retornar todos os pagamentos ordenados por criação", async () => {
      const pagamentos = [
        {
          id: "payment-1",
          serviceOrderId: "order-1",
          amount: 150.5,
          method: "PIX",
          status: "PAID",
        },
        {
          id: "payment-2",
          serviceOrderId: "order-2",
          amount: 80,
          method: "CREDIT_CARD",
          status: "PENDING",
        },
      ];
      prisma.payment.findMany.mockResolvedValue(pagamentos);

      const result = await service.findAll();

      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(pagamentos);
    });

    it("deve retornar lista vazia quando não houver pagamentos", async () => {
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("deve registrar transação com status PENDING", async () => {
      const dto = {
        serviceOrderId: "order-1",
        amount: 150,
        method: PaymentMethod.PIX,
      };
      const pagamento = { id: "payment-1", ...dto, status: "PENDING" };
      prisma.payment.create.mockResolvedValue(pagamento);

      const result = await service.create(dto);

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          serviceOrderId: "order-1",
          amount: 150,
          method: "PIX",
          status: "PENDING",
        },
      });
      expect(result).toEqual(pagamento);
    });
  });

  describe("generateCharge", () => {
    it("deve lançar NotFoundException quando o pagamento não existe", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.generateCharge("payment-x")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("deve lançar BadRequestException quando o pagamento não está pendente", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
      });

      await expect(service.generateCharge("payment-1")).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    describe("sem gateway configurado (mock)", () => {
      it("deve gerar cobrança mock e gravar externalRef", async () => {
        prisma.payment.findUnique.mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.PIX,
          status: "PENDING",
          amount: 150,
        });
        prisma.payment.update.mockResolvedValue({});

        const result = await service.generateCharge("payment-1");

        expect(prisma.payment.update).not.toHaveBeenCalled();
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
        });

        const result = await service.generateCharge("payment-2");

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
        });
        mercadoPago.createPixCharge.mockResolvedValue({
          id: "12345",
          status: "pending",
          qrCode: "00020126580014br.gov.bcb.pix...",
          qrCodeBase64: "iVBORw0KGgo...",
        });
        prisma.payment.update.mockResolvedValue({});

        const result = await service.generateCharge("payment-1");

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
        });
        mercadoPago.createPixCharge.mockResolvedValue({
          id: "12345",
          status: "pending",
          qrCode: "...",
          qrCodeBase64: "...",
        });
        prisma.payment.update.mockResolvedValue({});

        await service.generateCharge("payment-1");

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
        });

        const result = await service.generateCharge("payment-2");

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
      method: "PIX",
      status: "PAID",
      externalRef: "tx_mock_123",
      paidAt: new Date("2026-08-08T12:30:00.000Z"),
      createdAt: new Date("2026-08-08T10:00:00.000Z"),
    };

    it("deve retornar o status do pagamento", async () => {
      prisma.payment.findUnique.mockResolvedValue(pagamentoCompleto);

      const result = await service.getStatus("payment-1");

      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: "payment-1" },
      });
      expect(result).toEqual({
        paymentId: "payment-1",
        status: "PAID",
        method: "PIX",
        amount: 150,
        externalRef: "tx_mock_123",
        paidAt: pagamentoCompleto.paidAt,
        createdAt: pagamentoCompleto.createdAt,
      });
    });

    it("deve lançar NotFoundException quando o pagamento não existe", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.getStatus("payment-99")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("confirmPayment (webhook mock)", () => {
    const dto = {
      paymentId: "payment-1",
      externalId: "tx_mock_123",
      amount: 150,
    };

    it("deve marcar como PAID e gravar externalRef e paidAt", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PENDING",
      });
      prisma.payment.update.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        externalRef: "tx_mock_123",
      });

      const result = await service.confirmPayment(dto);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: {
          status: "PAID",
          paidAt: expect.any(Date),
          externalRef: "tx_mock_123",
        },
      });
      expect(result.status).toBe("PAID");
    });

    it("deve lançar NotFoundException quando o pagamento não existe", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.confirmPayment(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("deve ser idempotente: não alterar pagamento já PAID", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        status: "PAID",
        paidAt: new Date(),
      });

      const result = await service.confirmPayment(dto);

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(result.status).toBe("PAID");
    });
  });

  describe("handleMercadoPagoWebhook", () => {
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
      const result = await service.handleMercadoPagoWebhook(dto);

      expect(mercadoPago.getPayment).toHaveBeenCalledWith("12345");
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: {
          status: "PAID",
          paidAt: expect.any(Date),
          externalRef: "12345",
        },
      });
      expect(result.status).toBe("PAID");
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
      });
      prisma.payment.update.mockResolvedValue({
        id: "payment-1",
        status: "FAILED",
      });

      const resultado = await service.handleMercadoPagoWebhook({
        type: "payment",
        action: "payment.updated",
        data: { id: "12345" },
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: {
          status: "FAILED",
          paidAt: null,
          externalRef: "12345",
        },
      });
      expect(resultado.status).toBe("FAILED");
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
        service.handleMercadoPagoWebhook({
          type: "payment",
          action: "payment.updated",
          data: { id: "12345" },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});