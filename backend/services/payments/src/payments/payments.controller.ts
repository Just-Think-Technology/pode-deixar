import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";

@ApiTags("Pagamentos")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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
    summary: "Gerar cobrança após aceite de proposta (mock)",
    description:
      "Simula a criação da cobrança no gateway de pagamento para um pagamento pendente.",
  })
  @ApiParam({ name: "paymentId", description: "ID do pagamento" })
  @ApiResponse({
    status: 200,
    description: "Cobrança gerada com dados mockados",
  })
  @ApiResponse({ status: 404, description: "Pagamento não encontrado" })
  @ApiResponse({
    status: 400,
    description: "Pagamento não está pendente",
  })
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
}
