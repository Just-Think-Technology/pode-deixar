import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  Request,
  ForbiddenException,
  ParseUUIDPipe,
} from "@nestjs/common";
import * as crypto from "crypto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { PaymentsService } from "./payments.service";
import { MercadoPagoService } from "../mercadopago/mercadopago.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lista pagamentos do cliente autenticado" })
  @ApiResponse({ status: 200, description: "Lista de pagamentos retornada" })
  findAll(@Request() req: any) {
    return this.paymentsService.findAll(req.user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Registrar transação de pagamento no banco" })
  @ApiResponse({ status: 201, description: "Pagamento registrado (PENDING)" })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  @ApiResponse({ status: 403, description: "Pedido não pertence ao cliente" })
  create(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(req.user.sub, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(":paymentId/charge")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Gerar cobrança após aceite de proposta (mock ou gateway)",
    description:
      "Gera cobrança via Mercado Pago (PIX) quando configurado; caso contrário, retorna dados mockados.",
  })
  @ApiParam({ name: "paymentId", description: "ID do pagamento" })
  @ApiResponse({ status: 200, description: "Cobrança gerada" })
  @ApiResponse({ status: 404, description: "Pagamento não encontrado" })
  @ApiResponse({ status: 400, description: "Pagamento não está pendente" })
  generateCharge(
    @Request() req: any,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
  ) {
    return this.paymentsService.generateCharge(req.user.sub, paymentId);
  }

  @Get(":paymentId/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Consultar status do pagamento" })
  @ApiParam({ name: "paymentId", description: "ID do pagamento" })
  @ApiResponse({ status: 200, description: "Status do pagamento retornado" })
  @ApiResponse({ status: 404, description: "Pagamento não encontrado" })
  @ApiResponse({
    status: 403,
    description: "Pagamento não pertence ao cliente",
  })
  getStatus(
    @Request() req: any,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
  ) {
    return this.paymentsService.getStatus(req.user.sub, paymentId);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post("webhook")
  @ApiOperation({
    summary: "Webhook (mock) — confirmar pagamento recebido",
    description:
      "Simula o retorno do gateway de pagamento e marca o pagamento como PAID.",
  })
  @ApiResponse({ status: 200, description: "Pagamento confirmado (PAID)" })
  @ApiResponse({ status: 404, description: "Pagamento não encontrado" })
  @ApiResponse({ status: 403, description: "Chave de webhook inválida" })
  async webhook(
    @Headers("x-webhook-key") webhookKey: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    if (!this.validarChaveWebhook(webhookKey)) {
      throw new ForbiddenException("Chave de webhook inválida");
    }
    return this.paymentsService.confirmPayment(dto);
  }

  private validarChaveWebhook(webhookKey: string | undefined): boolean {
    const esperada = process.env.MOCK_WEBHOOK_KEY || "";
    if (!webhookKey || !esperada) {
      return false;
    }
    const a = Buffer.from(webhookKey);
    const b = Buffer.from(esperada);
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  }
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post("webhook/mercadopago")
  @ApiOperation({
    summary: "Webhook do Mercado Pago — confirmação de pagamento",
    description:
      "Recebe as notificações do Mercado Pago, valida a assinatura e atualiza o status do pagamento conforme o gateway.",
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
