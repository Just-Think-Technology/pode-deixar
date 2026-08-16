import { Injectable } from "@nestjs/common";
import { PaymentGateway } from "./payment-gateway.interface";
import { MercadoPagoGateway } from "./mercadopago.gateway";
import { MockPaymentGateway } from "./mock-payment.gateway";

/**
 * Seleciona o gateway ativo. Sem credenciais configuradas, o gateway mock
 * assume (modo desenvolvimento/testes).
 */
@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly mercadoPago: MercadoPagoGateway,
    private readonly mockGateway: MockPaymentGateway,
  ) {}

  get active(): PaymentGateway {
    return this.mercadoPago.isConfigured ? this.mercadoPago : this.mockGateway;
  }

  get mock(): PaymentGateway {
    return this.mockGateway;
  }

  getByName(name: string): PaymentGateway | undefined {
    const gateways = [this.mercadoPago, this.mockGateway];
    return gateways.find((gateway) => gateway.name === name.toUpperCase());
  }
}
