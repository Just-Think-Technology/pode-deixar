import { Test, TestingModule } from "@nestjs/testing";
import { PaymentMethod } from "@prisma/client";
import { MockPaymentGateway } from "../src/gateway/mock-payment.gateway";

describe("MockPaymentGateway", () => {
  let gateway: MockPaymentGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockPaymentGateway],
    }).compile();

    gateway = module.get<MockPaymentGateway>(MockPaymentGateway);
  });

  it("deve expor o nome e estar sempre configurado", () => {
    expect(gateway.name).toBe("MOCK");
    expect(gateway.isConfigured).toBe(true);
  });

  it("deve gerar cobrança PIX com pixCopiaECola", async () => {
    const result = await gateway.createCharge({
      amount: 150,
      externalReference: "payment-1",
      method: PaymentMethod.PIX,
      description: "Pedido payment-1",
    });

    expect(result.id).toMatch(/^chg_mock_/);
    expect(result.status).toBe("PENDING");
    expect(result.cobranca.pixCopiaECola).toContain("br.gov.bcb.pix");
    expect(result.cobranca.linkCheckout).toBeUndefined();
  });

  it("deve gerar link de checkout para cartão de crédito", async () => {
    const result = await gateway.createCharge({
      amount: 80,
      externalReference: "payment-2",
      method: PaymentMethod.CREDIT_CARD,
    });

    expect(
      (result.cobranca as Record<string, string>).linkCheckout,
    ).toMatch(/^https:\/\/checkout\.mock\.pode-deixar\.com\//);
    expect(result.cobranca.pixCopiaECola).toBeUndefined();
  });

  it("deve montar o chargeRef com base no externalReference", async () => {
    const result = await gateway.createCharge({
      amount: 10,
      externalReference: "payment-123456789",
      method: PaymentMethod.PIX,
    });

    expect(result.id).toBe("chg_mock_payment12345");
  });

  it("não deve suportar consulta de pagamento nem webhooks", () => {
    expect(() => gateway.getPayment("x")).rejects.toThrow("consultas de pagamento não implementadas");
    expect(gateway.validateWebhook({}, {})).toBe(false);
    expect(gateway.extractEventId({}, {})).toBe("");
    expect(gateway.extractGatewayPaymentId({})).toBe("");
    expect(gateway.translateStatus("approved")).toBe("PENDING");
  });
});