import { Injectable, BadGatewayException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface CreatePixChargeParams {
  amount: number;
  externalReference: string;
  payerEmail: string;
  notificationUrl?: string;
}

export interface PixChargeResult {
  id: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
}

export interface MercadoPagoPaymentStatus {
  id: string;
  status: string;
  transactionAmount: number;
  externalReference: string | null;
}

@Injectable()
export class MercadoPagoService {
  private readonly apiBase = "https://api.mercadopago.com";

  private get accessToken(): string {
    return process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
  }

  get isConfigured(): boolean {
    return this.accessToken.startsWith("TEST-");
  }

  private get webhookSecret(): string | undefined {
    return process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  }

  async createPixCharge(
    params: CreatePixChargeParams,
  ): Promise<PixChargeResult> {
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
        payer: { email: params.payerEmail },
        external_reference: params.externalReference,
        notification_url: params.notificationUrl,
        description: `Pedido ${params.externalReference}`,
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
      qrCode: data.point_of_interaction?.transaction_data?.qr_code || "",
      qrCodeBase64:
        data.point_of_interaction?.transaction_data?.qr_code_base64 || "",
    };
  }

  async getPayment(paymentId: string): Promise<MercadoPagoPaymentStatus> {
    const response = await fetch(`${this.apiBase}/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

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

  validateWebhookSignature(
    headers: Record<string, string | undefined>,
    body: { id: string },
  ): boolean {
    if (!this.webhookSecret) {
      return true;
    }

    const xSignature = headers["x-signature"] || "";
    const xRequestId = headers["x-request-id"] || "";
    const params = new URLSearchParams(xSignature);
    const ts = params.get("ts");
    const v1 = params.get("v1");

    if (!ts || !v1) {
      return false;
    }

    const manifest = `id:${body.id};request-id:${xRequestId};ts:${ts};`;
    const esperado = Buffer.from(
      createHmac("sha256", this.webhookSecret).update(manifest).digest("hex"),
    );
    const recebido = Buffer.from(v1);

    if (esperado.length !== recebido.length) {
      return false;
    }

    return timingSafeEqual(esperado, recebido);
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
