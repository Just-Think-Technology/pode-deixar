import {
  Injectable,
  BadGatewayException,
  BadRequestException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PaymentStatus } from "@prisma/client";
import {
  CreateChargeParams,
  ChargeResult,
  GatewayPayment,
  PaymentGateway,
} from "../gateway/payment-gateway.interface";

@Injectable()
export class MercadoPagoGateway implements PaymentGateway {
  readonly name = "MERCADO_PAGO";

  private readonly apiBase = "https://api.mercadopago.com";

  private get accessToken(): string {
    return process.env.PAYMENT_GATEWAY_ACCESS_TOKEN || "";
  }

  private get isProductionToken(): boolean {
    return this.accessToken.startsWith("APP_USR-");
  }

  private get isSandboxToken(): boolean {
    return this.accessToken.startsWith("TEST-");
  }

  get isConfigured(): boolean {
    if (!this.accessToken) {
      return false;
    }

    return process.env.NODE_ENV === "production"
      ? this.isProductionToken
      : this.isSandboxToken;
  }

  private get webhookSecret(): string | undefined {
    return process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET;
  }

  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    const notificationUrl = process.env.PAYMENT_GATEWAY_NOTIFICATION_URL;

    if (notificationUrl && !notificationUrl.startsWith("https://")) {
      throw new BadGatewayException(
        "notificação: Mercado Pago exige URL de webhook exclusivamente via HTTPS",
      );
    }

    const response = await fetch(`${this.apiBase}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": params.externalReference,
      },
      body: JSON.stringify({
        transaction_amount: params.amount,
        payment_method_id: "pix",
        payer: {
          email:
            process.env.PAYMENT_GATEWAY_PAYER_EMAIL ||
            "sandbox@pode-deixar.com",
        },
        external_reference: params.externalReference,
        notification_url: notificationUrl,
        description: params.description ?? `Pedido ${params.externalReference}`,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new BadGatewayException(
        `Falha ao criar cobrança no Mercado Pago: ${this.extrairErro(data)}`,
      );
    }

    return {
      id: String(data.id),
      status: data.status,
      cobranca: {
        pixCopiaECola:
          data.point_of_interaction?.transaction_data?.qr_code || "",
        qrCodeBase64:
          data.point_of_interaction?.transaction_data?.qr_code_base64 || "",
        mercadoPagoId: String(data.id),
      },
    };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment> {
    if (!/^\d+$/.test(paymentId)) {
      throw new BadRequestException(
        "Identificador de pagamento inválido no gateway",
      );
    }
    const response = await fetch(
      `${this.apiBase}/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();
    if (!response.ok) {
      throw new BadGatewayException(
        `Falha ao consultar pagamento no Mercado Pago: ${this.extrairErro(data)}`,
      );
    }

    return {
      id: String(data.id),
      status: data.status,
      transactionAmount: Number(data.transaction_amount),
      externalReference: data.external_reference || null,
    };
  }

  validateWebhook(
    headers: Record<string, string | undefined>,
    body: unknown,
  ): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    const xSignature = headers["x-signature"] || "";
    const xRequestId = headers["x-request-id"] || "";
    const params = new URLSearchParams(xSignature);
    const ts = params.get("ts");
    const v1 = params.get("v1");

    if (!ts || !v1) {
      return false;
    }

    const tsNumero = Number(ts);
    if (!Number.isFinite(tsNumero)) {
      return false;
    }

    const JANELA_ACEITAVEL_S = 5 * 60;
    const agoraS = Math.floor(Date.now() / 1000);
    if (Math.abs(agoraS - tsNumero) > JANELA_ACEITAVEL_S) {
      return false;
    }

    let paymentId: string;
    try {
      paymentId = this.extractGatewayPaymentId(body);
    } catch {
      return false;
    }
    const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
    const esperado = Buffer.from(
      createHmac("sha256", this.webhookSecret).update(manifest).digest("hex"),
    );
    const recebido = Buffer.from(v1);

    if (esperado.length !== recebido.length) {
      return false;
    }

    return timingSafeEqual(esperado, recebido);
  }

  extractEventId(
    headers: Record<string, string | undefined>,
    body: unknown,
  ): string {
    if (headers["x-request-id"]) {
      return headers["x-request-id"];
    }
    const gatewayPaymentId = this.extractGatewayPaymentId(body);
    const slug = this.name.toLowerCase().replace(/_/g, "");
    const corpo = body as
      { type?: unknown; topic?: unknown; action?: unknown } | null | undefined;
    const tipo =
      typeof corpo?.type === "string" && corpo.type
        ? corpo.type
        : typeof corpo?.topic === "string" && corpo.topic
          ? corpo.topic
          : undefined;
    const acao =
      typeof corpo?.action === "string" && corpo.action
        ? corpo.action
        : undefined;
    if (!tipo && !acao) {
      return `${slug}:${gatewayPaymentId}`;
    }
    const prefixoTipo = tipo ?? "notificacao";
    const sufixoAcao = acao ? `:${acao}` : "";
    return `${slug}:${prefixoTipo}${sufixoAcao}:${gatewayPaymentId}`;
  }

  extractGatewayPaymentId(body: unknown): string {
    if (
      typeof body === "object" &&
      body !== null &&
      "data" in body &&
      typeof body.data === "object" &&
      (body as { data: { id?: unknown } }).data !== null &&
      "id" in (body as { data: { id?: unknown } }).data
    ) {
      const bruto = String((body as { data: { id: unknown } }).data.id);
      if (!/^\d+$/.test(bruto)) {
        throw new BadRequestException(
          "Identificador de pagamento inválido no gateway",
        );
      }
      return bruto;
    }
    return "";
  }

  translateStatus(gatewayStatus: string): PaymentStatus {
    const mapa: Record<string, PaymentStatus> = {
      approved: "PAID",
      pending: "PENDING",
      in_process: "PENDING",
      rejected: "FAILED",
      cancelled: "CANCELLED",
      refunded: "REFUNDED",
    };

    // eslint-disable-next-line security/detect-object-injection
    const traduzido = mapa[gatewayStatus];

    if (!traduzido) {
      throw new BadRequestException(
        `Status do gateway desconhecido: ${gatewayStatus}`,
      );
    }

    return traduzido;
  }

  private extrairErro(data: unknown): string {
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
    return JSON.stringify(data);
  }
}
