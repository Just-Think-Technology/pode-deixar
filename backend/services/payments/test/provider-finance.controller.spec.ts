import { Test, TestingModule } from "@nestjs/testing";
import { PaymentStatus } from "@prisma/client";
import { ProviderFinanceController } from "../src/payments/provider-finance.controller";
import { PaymentsService } from "../src/payments/payments.service";

describe("ProviderFinanceController", () => {
  let controller: ProviderFinanceController;
  let service: {
    getProviderFinanceSummary: jest.Mock;
    getProviderFinanceItems: jest.Mock;
    getProviderFinanceChart: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getProviderFinanceSummary: jest.fn(),
      getProviderFinanceItems: jest.fn(),
      getProviderFinanceChart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderFinanceController],
      providers: [{ provide: PaymentsService, useValue: service }],
    }).compile();

    controller = module.get<ProviderFinanceController>(ProviderFinanceController);
  });

  it("deve ser definido", () => {
    expect(controller).toBeDefined();
  });

  describe("summary", () => {
    it("deve repassar o prestador autenticado ao service", async () => {
      const req = { user: { sub: "provider-1" } };
      const resumo = { currency: "BRL", toReceiveNet: 315 };
      service.getProviderFinanceSummary.mockResolvedValue(resumo);

      const result = await controller.summary(req);

      expect(service.getProviderFinanceSummary).toHaveBeenCalledWith("provider-1");
      expect(result).toEqual(resumo);
    });
  });

  describe("items", () => {
    it("deve repassar o prestador e o filtro de status ao service", async () => {
      const req = { user: { sub: "provider-1" } };
      const itens = [{ paymentId: "payment-1", paymentStatus: "PAID" }];
      service.getProviderFinanceItems.mockResolvedValue(itens);

      const result = await controller.items(req, {
        status: PaymentStatus.PAID,
      });

      expect(service.getProviderFinanceItems).toHaveBeenCalledWith(
        "provider-1",
        PaymentStatus.PAID,
      );
      expect(result).toEqual(itens);
    });

    it("deve chamar o service sem filtro quando o status não é informado", async () => {
      const req = { user: { sub: "provider-1" } };
      service.getProviderFinanceItems.mockResolvedValue([]);

      await controller.items(req, {});

      expect(service.getProviderFinanceItems).toHaveBeenCalledWith(
        "provider-1",
        undefined,
      );
    });
  });

  describe("chart", () => {
    it("deve repassar o prestador e o número de meses ao service", async () => {
      const req = { user: { sub: "provider-1" } };
      const dados = [{ month: "2026-03", netReceived: 0, feesRetained: 0 }];
      service.getProviderFinanceChart.mockResolvedValue(dados);

      const result = await controller.chart(req, { months: 6 });

      expect(service.getProviderFinanceChart).toHaveBeenCalledWith(
        "provider-1",
        6,
      );
      expect(result).toEqual(dados);
    });

    it("deve usar 6 meses como padrão quando o query é vazio", async () => {
      const req = { user: { sub: "provider-1" } };
      service.getProviderFinanceChart.mockResolvedValue([]);

      await controller.chart(req, {});

      expect(service.getProviderFinanceChart).toHaveBeenCalledWith(
        "provider-1",
        6,
      );
    });
  });
});
