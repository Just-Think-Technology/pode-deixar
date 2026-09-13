// MercadoPago gateway tests — charge creation and config

import { Test, TestingModule } from "@nestjs/testing";
import { BadGatewayException } from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { MercadoPagoGateway } from "../src/gateway/mercadopago.gateway";

// --- Tests ---

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

  it("should expose the canonical gateway name", () => {
    expect(gateway.name).toBe("MERCADO_PAGO");
  });

  describe("isConfigured", () => {
    const originalToken = process.env.PAYMENT_GATEWAY_ACCESS_TOKEN;
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.PAYMENT_GATEWAY_ACCESS_TOKEN = originalToken;
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should be true in dev when the token starts with TEST-", () => {
      process.env.NODE_ENV = "development";
      process.env.PAYMENT_GATEWAY_ACCESS_TOKEN = "TEST-123456789";
      expect(gateway.isConfigured).toBe(true);
    });

    it("should be false in dev when the token is a production one", () => {
      process.env.NODE_ENV = "development";
      process.env.PAYMENT_GATEWAY_ACCESS_TOKEN = "APP_USR-123456789";
      expect(gateway.isConfigured).toBe(false);
    });

    it("should be true in production when the token is APP_USR-", () => {
      process.env.NODE_ENV = "production";
      process.env.PAYMENT_GATEWAY_ACCESS_TOKEN = "APP_USR-123456789";
      expect(gateway.isConfigured).toBe(true);
    });

    it("should be false in production when the token is a test one", () => {
      process.env.NODE_ENV = "production";
      process.env.PAYMENT_GATEWAY_ACCESS_TOKEN = "TEST-123456789";
      expect(gateway.isConfigured).toBe(false);
    });

    it("should be false when the token is not configured", () => {
      delete process.env.PAYMENT_GATEWAY_ACCESS_TOKEN;
      expect(gateway.isConfigured).toBe(false);
    });
  });

  describe("createCharge", () => {
    const originalPayerEmail = process.env.PAYMENT_GATEWAY_PAYER_EMAIL;
    const originalNotificationUrl = process.env.PAYMENT_GATEWAY_NOTIFICATION_URL;

    afterEach(() => {
      process.env.PAYMENT_GATEWAY_PAYER_EMAIL = originalPayerEmail;
      process.env.PAYMENT_GATEWAY_NOTIFICATION_URL = originalNotificationUrl;
    });

    it("should create a PIX charge and return the payment data", async () => {
      process.env.PAYMENT_GATEWAY_PAYER_EMAIL = "teste@example.com";
      process.env.PAYMENT_GATEWAY_NOTIFICATION_URL =
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

    it("should use the default email when PAYMENT_GATEWAY_PAYER_EMAIL is missing", async () => {
      delete process.env.PAYMENT_GATEWAY_PAYER_EMAIL;
      delete process.env.PAYMENT_GATEWAY_NOTIFICATION_URL;
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

    it("should throw BadGatewayException when the API returns an error", async () => {
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

    it("should reject notification_url without HTTPS (fail-closed)", async () => {
      process.env.PAYMENT_GATEWAY_NOTIFICATION_URL = "http://exemplo.com/webhook";

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
    it("should return the payment status from the gateway", async () => {
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

    it("should throw BadGatewayException when the lookup fails", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "not_found" }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(gateway.getPayment("999")).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("should reject a malformed ID before calling the API (injection)", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(gateway.getPayment("../../1")).rejects.toThrow(
        "Identificador de pagamento inválido",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("validateWebhook", () => {
    const originalSecret = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET;

    afterEach(() => {
      process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = originalSecret;
    });

    it("should reject when no secret is configured (fail-closed)", () => {
      delete process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET;
      expect(
        gateway.validateWebhook({}, { data: { id: "123" } }),
      ).toBe(false);
    });

    it("should validate a correct HMAC signature", () => {
      process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = "secret-de-teste";
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

    it("should reject a valid signature outside the time window (anti-replay)", () => {
      process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = "secret-de-teste";
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

    it("should reject an invalid signature", () => {
      process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = "secret-de-teste";

      const valid = gateway.validateWebhook(
        {
          "x-signature": "ts=1700000000000&v1=assinatura-invalida",
          "x-request-id": "req-1",
        },
        { data: { id: "123" } },
      );

      expect(valid).toBe(false);
    });

    it("should reject when signature fields are missing", () => {
      process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = "secret-de-teste";

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

    it("deve incluir o tipo da notificação no fallback sem x-request-id", () => {
      const eventId = gateway.extractEventId(
        {},
        { type: "payment", action: "payment.updated", data: { id: "123" } },
      );
      expect(eventId).toBe("mercadopago:payment:payment.updated:123");
    });

    it("deve extrair o ID do pagamento do payload", () => {
      expect(
        gateway.extractGatewayPaymentId({ data: { id: "123" } }),
      ).toBe("123");
    });

    it("deve rejeitar ID do gateway fora do formato numérico", () => {
      expect(() =>
        gateway.extractGatewayPaymentId({ data: { id: "../x" } }),
      ).toThrow("Identificador de pagamento inválido");
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

    it("deve lançar para status desconhecido (fail-closed, sem cair em PENDING)", () => {
      expect(() => gateway.translateStatus("desconhecido")).toThrow(
        "Status do gateway desconhecido",
      );
    });
  });
});