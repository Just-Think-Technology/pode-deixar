import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { PaymentsService } from "../src/payments/payments.service";
import { PrismaService } from "../src/prisma/prisma.service";

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

  beforeEach(async () => {
    prisma = {
      payment: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
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
    it("deve gerar cobrança mock e gravar externalRef", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        method: PaymentMethod.PIX,
        status: "PENDING",
      });
      prisma.payment.update.mockResolvedValue({});

      const result = await service.generateCharge("payment-1");

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        data: { externalRef: expect.stringMatching(/^chg_mock_/) },
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
      });
      prisma.payment.update.mockResolvedValue({});

      const result = await service.generateCharge("payment-2");

      expect(result.cobranca.linkCheckout).toMatch(
        /^https:\/\/checkout\.mock\.pode-deixar\.com\//,
      );
    });

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

  describe("confirmPayment", () => {
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
});