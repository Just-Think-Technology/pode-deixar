import { Test, TestingModule } from "@nestjs/testing";
import { PaymentMethod } from "@prisma/client";
import { PaymentsController } from "../src/payments/payments.controller";
import { PaymentsService } from "../src/payments/payments.service";
import { MercadoPagoService } from "../src/mercadopago/mercadopago.service";

describe("PaymentsController", () => {
  let controller: PaymentsController;
  let service: {
    findAll: jest.Mock;
    create: jest.Mock;
    generateCharge: jest.Mock;
    getStatus: jest.Mock;
    confirmPayment: jest.Mock;
    handleMercadoPagoWebhook: jest.Mock;
  };
  let mercadoPago: {
    validateWebhookSignature: jest.Mock;
    isConfigured: boolean;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      generateCharge: jest.fn(),
      getStatus: jest.fn(),
      confirmPayment: jest.fn(),
      handleMercadoPagoWebhook: jest.fn(),
    };
    mercadoPago = {
      validateWebhookSignature: jest.fn().mockReturnValue(true),
      isConfigured: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: service },
        { provide: MercadoPagoService, useValue: mercadoPago },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it("deve ser definido", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("deve retornar a lista de pagamentos do service", async () => {
      const pagamentos = [{ id: "payment-1", status: "PAID" }];
      service.findAll.mockResolvedValue(pagamentos);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(pagamentos);
    });
  });

  describe("create", () => {
    it("deve registrar a transação via service", async () => {
      const dto = {
        serviceOrderId: "order-1",
        amount: 150,
        method: PaymentMethod.PIX,
      };
      const pagamento = { id: "payment-1", ...dto, status: "PENDING" };
      service.create.mockResolvedValue(pagamento);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(pagamento);
    });
  });

  describe("generateCharge", () => {
    it("deve repassar o paymentId ao service", async () => {
      const cobranca = { paymentId: "payment-1", status: "PENDING" };
      service.generateCharge.mockResolvedValue(cobranca);

      const result = await controller.generateCharge("payment-1");

      expect(service.generateCharge).toHaveBeenCalledWith("payment-1");
      expect(result).toEqual(cobranca);
    });
  });

  describe("getStatus", () => {
    it("deve repassar o paymentId ao service", async () => {
      const status = { paymentId: "payment-1", status: "PAID" };
      service.getStatus.mockResolvedValue(status);

      const result = await controller.getStatus("payment-1");

      expect(service.getStatus).toHaveBeenCalledWith("payment-1");
      expect(result).toEqual(status);
    });
  });

  describe("webhook (mock)", () => {
    it("deve repassar o payload ao confirmPayment", async () => {
      const dto = {
        paymentId: "payment-1",
        externalId: "tx_mock_123",
        amount: 150,
      };
      const pagamento = { id: "payment-1", status: "PAID" };
      service.confirmPayment.mockResolvedValue(pagamento);

      const result = await controller.webhook(dto);

      expect(service.confirmPayment).toHaveBeenCalledWith(dto);
      expect(result).toEqual(pagamento);
    });
  });

  describe("webhook/mercadopago", () => {
    const dto = {
      type: "payment",
      action: "payment.updated",
      data: { id: "123456789" },
    };

    it("deve validar assinatura e repassar ao service", async () => {
      const result = { id: "payment-1", status: "PAID" };
      service.handleMercadoPagoWebhook.mockResolvedValue(result);

      const response = await controller.mercadopagoWebhook({}, dto);

      expect(mercadoPago.validateWebhookSignature).toHaveBeenCalledWith(
        {},
        { id: "123456789" },
      );
      expect(service.handleMercadoPagoWebhook).toHaveBeenCalledWith(dto);
      expect(response).toEqual(result);
    });

    it("deve lançar 403 quando a assinatura é inválida", async () => {
      mercadoPago.validateWebhookSignature.mockReturnValue(false);

      await expect(controller.mercadopagoWebhook({}, dto)).rejects.toThrow(
        "Assinatura de webhook inválida",
      );
      expect(service.handleMercadoPagoWebhook).not.toHaveBeenCalled();
    });
  });
});