import { PaymentMethod, PaymentStatus } from "@prisma/client";

export interface CreateChargeParams {
  amount: number;
  externalReference: string;
  method: PaymentMethod;
  description?: string;
}

export interface ChargeResult {
  id: string;
  status: string;
  cobranca: Record<string, unknown>;
}

export interface GatewayPayment {
  id: string;
  status: string;
  transactionAmount: number;
  externalReference: string | null;
}

export interface PaymentGateway {
  readonly name: string;

  readonly isConfigured: boolean;

  createCharge(params: CreateChargeParams): Promise<ChargeResult>;

  getPayment(gatewayPaymentId: string): Promise<GatewayPayment>;

  validateWebhook(
    headers: Record<string, string | undefined>,
    body: unknown,
  ): boolean;

  extractEventId(
    headers: Record<string, string | undefined>,
    body: unknown,
  ): string;

  extractGatewayPaymentId(body: unknown): string;

  translateStatus(gatewayStatus: string): PaymentStatus;
}
