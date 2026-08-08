import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { MercadoPagoService } from "../mercadopago/mercadopago.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";
import { MercadoPagoWebhookDto } from "./dto/mercadopago-webhook.dto";

@ApiTags("Pagamentos")
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lista todos os pagamentos" })
  @ApiResponse({ status: 200, description: "Lista de pagamentos retornada" })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: "Registrar transação de pagamento no banco" })
  @ApiResponse({ status: 201, description: "Pagamento registrado (PENDING)" })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Post(":paymentId/charge")
  @ApiOperation({
    summary: "Gerar cobrança após aceite de proposta (mock ou gateway)",
    description:
      "Gera cobrança via Mercado Pago (PIX) quando configurado; caso contrário, retorna dados mockados.",
  })
  @ApiParam({ name: "paymentId", description: "ID do pagamento" })
  @ApiResponse({ status: 200, description: "Cobrança gerada" })
  @ApiResponse({ status: 404, description: "Pagamento não encontrado" })
  @ApiResponse({ status: 400, description: "Pagamento não está pendente" })
  generateCharge(@Param("paymentId") paymentId: string) {
    return this.paymentsService.generateCharge(paymentId);
  }

  @Get(":paymentId/status")
  @ApiOperation({ summary: "Consultar status do pagamento" })
  @ApiParam({ name: "paymentId", description: "ID do pagamento" })
  @ApiResponse({ status: 200, description: "Status do pagamento retornado" })
  @ApiResponse({ status: 404, description: "Pagamento não encontrado" })
  getStatus(@Param("paymentId") paymentId: string) {
    return this.paymentsService.getStatus(paymentId);
  }

  @Post("webhook")
  @ApiOperation({
    summary: "Webhook (mock) — confirmar pagamento recebido",
    description:
      "Simula o retorno do gateway de pagamento e marca o pagamento como PAID.",
  })
  @ApiResponse({ status: 200, description: "Pagamento confirmado (PAID)" })
  @ApiResponse({ status: 404, description: "Pagamento não encontrado" })
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentsService.confirmPayment(dto);
  }

  @Post("webhook/mercadopago")
  @ApiOperation({
    summary: "Webhook do Mercado Pago — confirmação de pagamento",
    description:
      "Recebe as notificações do Mercado Pago, valida a assinatura (se configurada) e atualiza o status do pagamento conforme o gateway.",
  })
  @ApiResponse({ status: 200, description: "Webhook processado" })
  @ApiResponse({ status: 404, description: "Pagamento não encontrado" })
  @ApiResponse({ status: 403, description: "Assinatura de webhook inválida" })
  async mercadopagoWebhook(
    @Headers() headers: Record<string, string>,
    @Body() dto: MercadoPagoWebhookDto,
  ) {
    const signatureValid = this.mercadoPago.validateWebhookSignature(
      headers,
      dto.data,
    );

    if (!signatureValid) {
      throw new ForbiddenException("Assinatura de webhook inválida");
    }

    return this.paymentsService.handleMercadoPagoWebhook(dto);
  }
}
