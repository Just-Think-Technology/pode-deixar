import { Injectable } from "@nestjs/common";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import {
  CreateChargeParams,
  ChargeResult,
  GatewayPayment,
  PaymentGateway,
} from "./payment-gateway.interface";

/**
 * Gateway fake (desenvolvimento/testes): gera cobranças simuladas e não faz
 * nenhuma chamada externa. Usado quando nenhum gateway real está configurado.
 */
@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  readonly name = "MOCK";
  readonly isConfigured = true;

  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    const chargeRef = `chg_mock_${params.externalReference
      .replace(/-/g, "")
      .slice(0, 12)}`;

    return {
      id: chargeRef,
      status: "PENDING",
      cobranca: this.detalhesMock(params.method, chargeRef),
    };
  }

  async getPayment(_gatewayPaymentId: string): Promise<GatewayPayment> {
    throw new Error("Gateway mock não possui consulta de pagamento");
  }

  validateWebhook(
    _headers: Record<string, string | undefined>,
    _body: unknown,
  ): boolean {
    return false;
  }

  extractEventId(
    _headers: Record<string, string | undefined>,
    _body: unknown,
  ): string {
    return "";
  }

  extractGatewayPaymentId(_body: unknown): string {
    return "";
  }

  translateStatus(_gatewayStatus: string): PaymentStatus {
    return "PENDING";
  }

  private detalhesMock(
    method: PaymentMethod,
    chargeRef: string,
  ): Record<string, unknown> {
    if (method === PaymentMethod.PIX) {
      return {
        pixCopiaECola: `00020126580014br.gov.bcb.pix0136${chargeRef}5204000053039865406150.005802BR5913PODE-DEIXAR6009SAO PAULO`,
      };
    }

    return {
      linkCheckout: `https://checkout.mock.pode-deixar.com/${chargeRef}`,
    };
  }
}
