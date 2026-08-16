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

/**
 * Contrato de integração com um gateway de pagamento.
 * Cada gateway (Mercado Pago, Asaas, etc.) implementa um adapter deste port —
 * o núcleo de pagamentos não conhece detalhes do gateway.
 */
export interface PaymentGateway {
  /** Nome canônico usado em eventos de webhook e logs (ex.: "MERCADO_PAGO"). */
  readonly name: string;

  /** Gateway ativo? (token/credenciais configuradas e válidas para o ambiente). */
  readonly isConfigured: boolean;

  createCharge(params: CreateChargeParams): Promise<ChargeResult>;

  getPayment(gatewayPaymentId: string): Promise<GatewayPayment>;

  validateWebhook(
    headers: Record<string, string | undefined>,
    body: unknown,
  ): boolean;

  /** Extrai o eventId único da notificação (anti-replay/idempotência). */
  extractEventId(
    headers: Record<string, string | undefined>,
    body: unknown,
  ): string;

  /** Extrai o ID do pagamento no gateway a partir do payload do webhook. */
  extractGatewayPaymentId(body: unknown): string;

  /** Traduz o status do gateway para o PaymentStatus interno. */
  translateStatus(gatewayStatus: string): PaymentStatus;
}
