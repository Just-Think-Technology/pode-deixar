import { Test, TestingModule } from "@nestjs/testing";
import { BadGatewayException } from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { MercadoPagoGateway } from "../src/gateway/mercadopago.gateway";

describe("MercadoPagoGateway", () => {
  let gateway: MercadoPagoGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MercadoPagoGateway],
    }).compile();

    gateway = module.get<MercadoPagoGateway>(MercadoPagoGateway);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deve expor o nome canônico do gateway", () => {
    expect(gateway.name).toBe("MERCADO_PAGO");
  });

  describe("isConfigured", () => {
    const originalToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = originalToken;
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("deve ser true em dev quando o token começa com TEST-", () => {
      process.env.NODE_ENV = "development";
      process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-123456789";
      expect(gateway.isConfigured).toBe(true);
    });

    it("deve ser false em dev quando o token é de produção", () => {
      process.env.NODE_ENV = "development";
      process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-123456789";
      expect(gateway.isConfigured).toBe(false);
    });

    it("deve ser true em produção quando o token é APP_USR-", () => {
      process.env.NODE_ENV = "production";
      process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-123456789";
      expect(gateway.isConfigured).toBe(true);
    });

    it("deve ser false em produção quando o token é de teste", () => {
      process.env.NODE_ENV = "production";
      process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-123456789";
      expect(gateway.isConfigured).toBe(false);
    });

    it("deve ser false quando o token não está configurado", () => {
      delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
      expect(gateway.isConfigured).toBe(false);
    });
  });

  describe("createCharge", () => {
    const originalPayerEmail = process.env.MERCADO_PAGO_PAYER_EMAIL;
    const originalNotificationUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL;

    afterEach(() => {
      process.env.MERCADO_PAGO_PAYER_EMAIL = originalPayerEmail;
      process.env.MERCADO_PAGO_NOTIFICATION_URL = originalNotificationUrl;
    });

    it("deve criar cobrança PIX e retornar os dados de pagamento", async () => {
      process.env.MERCADO_PAGO_PAYER_EMAIL = "teste@example.com";
      process.env.MERCADO_PAGO_NOTIFICATION_URL =
        "https://exemplo.com/webhook";

      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 12345,
          status: "pending",
          point_of_interaction: {
            transaction_data: {
              qr_code: "00020126580014br.gov.bcb.pix...",
              qr_code_base64: "iVBORw0KGgo...",
            },
          },
        }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await gateway.createCharge({
        amount: 150,
        externalReference: "payment-1",
        method: PaymentMethod.PIX,
        description: "Pedido payment-1",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.mercadopago.com/v1/payments",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            transaction_amount: 150,
            payment_method_id: "pix",
            payer: { email: "teste@example.com" },
            external_reference: "payment-1",
            notification_url: "https://exemplo.com/webhook",
            description: "Pedido payment-1",
          }),
        }),
      );
      expect(result).toEqual({
        id: "12345",
        status: "pending",
        cobranca: {
          pixCopiaECola: "00020126580014br.gov.bcb.pix...",
          qrCodeBase64: "iVBORw0KGgo...",
          mercadoPagoId: "12345",
        },
      });
    });

    it("deve usar o email padrão quando MERCADO_PAGO_PAYER_EMAIL não existe", async () => {
      delete process.env.MERCADO_PAGO_PAYER_EMAIL;
      delete process.env.MERCADO_PAGO_NOTIFICATION_URL;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 1,
          status: "pending",
          point_of_interaction: { transaction_data: {} },
        }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await gateway.createCharge({
        amount: 150,
        externalReference: "payment-1",
        method: PaymentMethod.PIX,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(
            JSON.stringify("sandbox@pode-deixar.com"),
          ),
        }),
      );
    });

    it("deve lançar BadGatewayException quando a API retorna erro", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Credenciais inválidas" }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(
        gateway.createCharge({
          amount: 150,
          externalReference: "payment-1",
          method: PaymentMethod.PIX,
        }),
      ).rejects.toThrow(BadGatewayException);
    });

    it("deve rejeitar notification_url sem HTTPS (fail-closed)", async () => {
      process.env.MERCADO_PAGO_NOTIFICATION_URL = "http://exemplo.com/webhook";

      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(
        gateway.createCharge({
          amount: 150,
          externalReference: "payment-1",
          method: PaymentMethod.PIX,
        }),
      ).rejects.toThrow(/HTTPS/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("getPayment", () => {
    it("deve retornar o status do pagamento pelo gateway", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 12345,
          status: "approved",
          transaction_amount: 150,
          external_reference: "payment-1",
        }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await gateway.getPayment("12345");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.mercadopago.com/v1/payments/12345",
        expect.objectContaining({
          headers: {
            Authorization: expect.any(String),
            "Content-Type": "application/json",
          },
        }),
      );
      expect(result).toEqual({
        id: "12345",
        status: "approved",
        transactionAmount: 150,
        externalReference: "payment-1",
      });
    });

    it("deve lançar BadGatewayException quando a consulta falha", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "not_found" }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(gateway.getPayment("999")).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe("validateWebhook", () => {
    const originalSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    afterEach(() => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = originalSecret;
    });

    it("deve rejeitar quando não há secret configurado (fail-closed)", () => {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      expect(
        gateway.validateWebhook({}, { data: { id: "123" } }),
      ).toBe(false);
    });

    it("deve validar assinatura HMAC correta", () => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-de-teste";
      const crypto = require("node:crypto");
      const tsAtual = Math.floor(Date.now() / 1000);
      const manifest = `id:123;request-id:req-1;ts:${tsAtual};`;
      const esperado = crypto
        .createHmac("sha256", "secret-de-teste")
        .update(manifest)
        .digest("hex");

      const valid = gateway.validateWebhook(
        {
          "x-signature": `ts=${tsAtual}&v1=${esperado}`,
          "x-request-id": "req-1",
        },
        { data: { id: "123" } },
      );

      expect(valid).toBe(true);
    });

    it("deve rejeitar assinatura válida mas fora da janela de tempo (anti-replay)", () => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-de-teste";
      const crypto = require("node:crypto");
      const tsVelho = Math.floor(Date.now() / 1000) - 3600;
      const manifest = `id:123;request-id:req-1;ts:${tsVelho};`;
      const esperado = crypto
        .createHmac("sha256", "secret-de-teste")
        .update(manifest)
        .digest("hex");

      const valid = gateway.validateWebhook(
        {
          "x-signature": `ts=${tsVelho}&v1=${esperado}`,
          "x-request-id": "req-1",
        },
        { data: { id: "123" } },
      );

      expect(valid).toBe(false);
    });

    it("deve rejeitar assinatura inválida", () => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-de-teste";

      const valid = gateway.validateWebhook(
        {
          "x-signature": "ts=1700000000000&v1=assinatura-invalida",
          "x-request-id": "req-1",
        },
        { data: { id: "123" } },
      );

      expect(valid).toBe(false);
    });

    it("deve rejeitar quando faltam campos da assinatura", () => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-de-teste";

      const valid = gateway.validateWebhook(
        { "x-request-id": "req-1" },
        { data: { id: "123" } },
      );

      expect(valid).toBe(false);
    });
  });

  describe("extractEventId / extractGatewayPaymentId", () => {
    it("deve usar o header x-request-id como eventId", () => {
      const eventId = gateway.extractEventId(
        { "x-request-id": "req-1" },
        { data: { id: "123" } },
      );
      expect(eventId).toBe("req-1");
    });

    it("deve derivar o eventId do ID do pagamento quando não há x-request-id", () => {
      const eventId = gateway.extractEventId({}, { data: { id: "123" } });
      expect(eventId).toBe("mercadopago:123");
    });

    it("deve extrair o ID do pagamento do payload", () => {
      expect(
        gateway.extractGatewayPaymentId({ data: { id: "123" } }),
      ).toBe("123");
    });

    it("deve retornar vazio para payload inválido", () => {
      expect(gateway.extractGatewayPaymentId({})).toBe("");
      expect(gateway.extractGatewayPaymentId(null)).toBe("");
    });
  });

  describe("translateStatus", () => {
    it("deve traduzir status do gateway para o modelo interno", () => {
      expect(gateway.translateStatus("approved")).toBe("PAID");
      expect(gateway.translateStatus("pending")).toBe("PENDING");
      expect(gateway.translateStatus("in_process")).toBe("PENDING");
      expect(gateway.translateStatus("rejected")).toBe("FAILED");
      expect(gateway.translateStatus("cancelled")).toBe("CANCELLED");
      expect(gateway.translateStatus("refunded")).toBe("REFUNDED");
    });

    it("deve cair em PENDING para status desconhecido (fail-closed)", () => {
      expect(gateway.translateStatus("desconhecido")).toBe("PENDING");
    });
  });
});