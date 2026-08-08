import { Test, TestingModule } from "@nestjs/testing";
import { BadGatewayException } from "@nestjs/common";
import { MercadoPagoService } from "../src/mercadopago/mercadopago.service";

describe("MercadoPagoService", () => {
  let service: MercadoPagoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MercadoPagoService],
    }).compile();

    service = module.get<MercadoPagoService>(MercadoPagoService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      expect(service.isConfigured).toBe(true);
    });

    it("deve ser false em dev quando o token é de produção", () => {
      process.env.NODE_ENV = "development";
      process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-123456789";
      expect(service.isConfigured).toBe(false);
    });

    it("deve ser true em produção quando o token é APP_USR-", () => {
      process.env.NODE_ENV = "production";
      process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-123456789";
      expect(service.isConfigured).toBe(true);
    });

    it("deve ser false em produção quando o token é de teste", () => {
      process.env.NODE_ENV = "production";
      process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-123456789";
      expect(service.isConfigured).toBe(false);
    });

    it("deve ser false quando o token não está configurado", () => {
      delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
      expect(service.isConfigured).toBe(false);
    });
  });

  describe("createPixCharge", () => {
    it("deve criar cobrança PIX e retornar o QR code", async () => {
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

      const result = await service.createPixCharge({
        amount: 150,
        externalReference: "payment-1",
        payerEmail: "teste@example.com",
        notificationUrl: "https://exemplo.com/webhook",
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
        qrCode: "00020126580014br.gov.bcb.pix...",
        qrCodeBase64: "iVBORw0KGgo...",
      });
    });

    it("deve lançar BadGatewayException quando a API retorna erro", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Credenciais inválidas" }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(
        service.createPixCharge({
          amount: 150,
          externalReference: "payment-1",
          payerEmail: "teste@example.com",
        }),
      ).rejects.toThrow(BadGatewayException);
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

      const result = await service.getPayment("12345");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.mercadopago.com/v1/payments/12345",
        expect.objectContaining({
          headers: { Authorization: expect.any(String), "Content-Type": "application/json" },
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

      await expect(service.getPayment("999")).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe("validateWebhookSignature", () => {
    const originalSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    afterEach(() => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = originalSecret;
    });

    it("deve rejeitar quando não há secret configurado (fail-closed)", () => {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      expect(service.validateWebhookSignature({}, { id: "123" })).toBe(false);
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

      const valid = service.validateWebhookSignature(
        {
          "x-signature": `ts=${tsAtual}&v1=${esperado}`,
          "x-request-id": "req-1",
        },
        { id: "123" },
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

      const valid = service.validateWebhookSignature(
        {
          "x-signature": `ts=${tsVelho}&v1=${esperado}`,
          "x-request-id": "req-1",
        },
        { id: "123" },
      );

      expect(valid).toBe(false);
    });

    it("deve rejeitar assinatura inválida", () => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-de-teste";

      const valid = service.validateWebhookSignature(
        {
          "x-signature": "ts=1700000000000&v1=assinatura-invalida",
          "x-request-id": "req-1",
        },
        { id: "123" },
      );

      expect(valid).toBe(false);
    });

    it("deve rejeitar quando faltam campos da assinatura", () => {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-de-teste";

      const valid = service.validateWebhookSignature(
        { "x-request-id": "req-1" },
        { id: "123" },
      );

      expect(valid).toBe(false);
    });
  });
});