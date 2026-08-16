import { Module, Global } from "@nestjs/common";
import { MercadoPagoGateway } from "./mercadopago.gateway";
import { MockPaymentGateway } from "./mock-payment.gateway";
import { PaymentGatewayFactory } from "./payment-gateway.factory";

@Global()
@Module({
  providers: [MercadoPagoGateway, MockPaymentGateway, PaymentGatewayFactory],
  exports: [PaymentGatewayFactory],
})
export class GatewayModule {}
