import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { PaymentsController } from "../src/payments/payments.controller";
import { PaymentsService } from "../src/payments/payments.service";
import { PaymentGatewayFactory } from "../src/gateway/payment-gateway.factory";
import { PaymentLoggerService } from "../src/payments/payment-logger.service";

describe("PaymentsController", () => {
  let controller: PaymentsController;
  let service: {
    findAll: jest.Mock;
    create: jest.Mock;
    generateCharge: jest.Mock;
    getStatus: jest.Mock;
    confirmPayment: jest.Mock;
    handleGatewayWebhook: jest.Mock;
  };
  let gateways: {
    getByName: jest.Mock;
  };
  let logger: {
    logAuthenticationFailure: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      generateCharge: jest.fn(),
      getStatus: jest.fn(),
      confirmPayment: jest.fn(),
      handleGatewayWebhook: jest.fn(),
    };
    gateways = {
      getByName: jest.fn(),
    };
    logger = {
      logAuthenticationFailure: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: service },
        { provide: PaymentGatewayFactory, useValue: gateways },
        { provide: PaymentLoggerService, useValue: logger },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it("deve ser definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("deve repassar o usuário autenticado ao service", async () => {
      const req = { user: { sub: "user-1" } };
      const pagamentos = [{ id: "payment-1", status: "PAID" }];
      service.findAll.mockResolvedValue(pagamentos);

      const result = await controller.findAll(req);

      expect(service.findAll).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(pagamentos);
    });
  });

  describe("create", () => {
    it("deve repassar o usuário e o DTO ao service", async () => {
      const req = { user: { sub: "user-1" } };
      const dto = {
        serviceOrderId: "uuid-do-pedido",
        method: PaymentMethod.PIX,
        scheduledAt: "2026-08-20T14:00:00.000Z",
      };
      const pagamento = { id: "payment-1", status: "PENDING", ...dto };
      service.create.mockResolvedValue(pagamento);

      const result = await controller.create(req, dto);

      expect(service.create).toHaveBeenCalledWith("user-1", dto);
      expect(result).toEqual(pagamento);
    });
  });

  describe("generateCharge", () => {
    it("deve repassar o usuário e o paymentId ao service", async () => {
      const req = { user: { sub: "user-1" } };
      const cobranca = { paymentId: "uuid-payment-1", status: "PENDING" };
      service.generateCharge.mockResolvedValue(cobranca);

      const result = await controller.generateCharge(req, "uuid-payment-1");

      expect(service.generateCharge).toHaveBeenCalledWith(
        "user-1",
        "uuid-payment-1",
      );
      expect(result).toEqual(cobranca);
    });
  });

  describe("getStatus", () => {
    it("deve repassar o usuário e o paymentId ao service", async () => {
      const req = { user: { sub: "user-1" } };
      const status = { paymentId: "uuid-payment-1", status: "PAID" };
      service.getStatus.mockResolvedValue(status);

      const result = await controller.getStatus(req, "uuid-payment-1");

      expect(service.getStatus).toHaveBeenCalledWith("user-1", "uuid-payment-1");
      expect(result).toEqual(status);
    });
  });

  describe("webhook (mock)", () => {
    it("deve confirmar quando a chave de webhook é válida", async () => {
      process.env.MOCK_WEBHOOK_KEY = "chave-secreta";
      const dto = {
        paymentId: "uuid-payment-1",
        externalId: "tx_mock_123",
        amount: 150,
        eventId: "evt_mock_1",
      };
      const pagamento = { id: "uuid-payment-1", status: "PAID" };
      service.confirmPayment.mockResolvedValue(pagamento);

      const result = await controller.webhook({} as any, "chave-secreta", dto);

      expect(service.confirmPayment).toHaveBeenCalledWith(dto);
      expect(result).toEqual(pagamento);
      delete process.env.MOCK_WEBHOOK_KEY;
    });

    it("deve lançar 403 quando a chave de webhook não confere", async () => {
      process.env.MOCK_WEBHOOK_KEY = "chave-secreta";
      const dto = {
        paymentId: "uuid-payment-1",
        externalId: "tx_mock_123",
        amount: 150,
        eventId: "evt_mock_1",
      };

      await expect(
        controller.webhook({} as any, "chave-errada", dto),
      ).rejects.toThrow(ForbiddenException);
      expect(service.confirmPayment).not.toHaveBeenCalled();
      delete process.env.MOCK_WEBHOOK_KEY;
    });

    it("deve rejeitar timestamp fora da janela aceitável", async () => {
      process.env.MOCK_WEBHOOK_KEY = "chave-secreta";
      const dto = {
        paymentId: "uuid-payment-1",
        externalId: "tx_mock_123",
        amount: 150,
        eventId: "evt_mock_1",
        timestamp: "1700000000",
      };

      await expect(
        controller.webhook({} as any, "chave-secreta", dto),
      ).rejects.toThrow(ForbiddenException);
      expect(service.confirmPayment).not.toHaveBeenCalled();
      delete process.env.MOCK_WEBHOOK_KEY;
    });

    it("deve rejeitar quando a req NÃO chega via HTTPS em produção", async () => {
      process.env.NODE_ENV = "production";
      process.env.MOCK_WEBHOOK_KEY = "chave-secreta";
      const dto = {
        paymentId: "uuid-payment-1",
        externalId: "tx_mock_123",
        amount: 150,
        eventId: "evt_mock_1",
      };

      await expect(
        controller.webhook(
          { headers: { "x-forwarded-proto": "http" } } as any,
          "chave-secreta",
          dto,
        ),
      ).rejects.toThrow("Webhook deve ser recebido via HTTPS");
      expect(service.confirmPayment).not.toHaveBeenCalled();
      delete process.env.NODE_ENV;
      delete process.env.MOCK_WEBHOOK_KEY;
    });
  });

  describe("webhook/:gateway", () => {
    const dto = {
      type: "payment",
      action: "payment.updated",
      data: { id: "123456789" },
    };
    const gateway = {
      name: "MERCADO_PAGO",
      isConfigured: true,
    };

    beforeEach(() => {
      gateways.getByName.mockReturnValue(gateway);
    });

    it("deve resolver o gateway pelo nome e repassar ao service", async () => {
      const result = { id: "payment-1", status: "PAID" };
      service.handleGatewayWebhook.mockResolvedValue(result);

      const headers = {
        "x-request-id": "evt-123",
        "x-signature": "ts=..&v1=..",
      };
      const req = { headers } as any;

      const response = await controller.gatewayWebhook(
        req,
        "mercadopago",
        headers,
        dto,
      );

      expect(gateways.getByName).toHaveBeenCalledWith("mercadopago");
      expect(service.handleGatewayWebhook).toHaveBeenCalledWith(
        gateway,
        headers,
        dto,
      );
      expect(response).toEqual(result);
    });

    it("deve lançar 404 para gateway desconhecido", async () => {
      gateways.getByName.mockReturnValue(undefined);

      await expect(
        controller.gatewayWebhook({} as any, "asaas", {}, dto),
      ).rejects.toThrow("Gateway de pagamento desconhecido: asaas");
      expect(service.handleGatewayWebhook).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando a req NÃO chega via HTTPS em produção", async () => {
      process.env.NODE_ENV = "production";

      await expect(
        controller.gatewayWebhook(
          { headers: { "x-forwarded-proto": "http" } } as any,
          "mercadopago",
          {},
          dto,
        ),
      ).rejects.toThrow("Webhook deve ser recebido via HTTPS");
      expect(service.handleGatewayWebhook).not.toHaveBeenCalled();
      delete process.env.NODE_ENV;
    });
  });
});