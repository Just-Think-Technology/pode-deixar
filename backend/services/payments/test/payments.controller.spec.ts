import { Test, TestingModule } from "@nestjs/testing";
import { PaymentMethod } from "@prisma/client";
import { PaymentsController } from "../src/payments/payments.controller";
import { PaymentsService } from "../src/payments/payments.service";

describe("PaymentsController", () => {
  let controller: PaymentsController;
  let service: {
    findAll: jest.Mock;
    create: jest.Mock;
    generateCharge: jest.Mock;
    getStatus: jest.Mock;
    confirmPayment: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      generateCharge: jest.fn(),
      getStatus: jest.fn(),
      confirmPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: service }],
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

  describe("webhook", () => {
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
});