import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  ParseUUIDPipe,
} from "@nestjs/common";
import * as crypto from "crypto";
import { Request as ExpressRequest } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { PaymentsService } from "./payments.service";
import { PaymentGatewayFactory } from "../gateway/payment-gateway.factory";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";
import { PaymentLoggerService } from "./payment-logger.service";

@ApiTags("Pagamentos")
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly gateways: PaymentGatewayFactory,
    private readonly logger: PaymentLoggerService,
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
      "Simula o retorno do gateway de pagamento e marca o pagamento como PAID. Endpoint restrito a HTTPS.",
  })
  @ApiResponse({ status: 200, description: "Pagamento confirmado (PAID)" })
  @ApiResponse({ status: 404, description: "Pagamento não encontrado" })
  @ApiResponse({ status: 403, description: "Chave de webhook inválida" })
  async webhook(
    @Req() httpRequest: ExpressRequest,
    @Headers("x-webhook-key") webhookKey: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    this.garantirRequestHttps(httpRequest);

    if (!this.validarChaveWebhook(webhookKey)) {
      this.logger.logAuthenticationFailure("webhook_key", dto.paymentId, null, {
        eventId: dto.eventId,
        providedKey: webhookKey ? "[REDACTED]" : "missing",
      });
      throw new ForbiddenException("Chave de webhook inválida");
    }

    if (dto.timestamp) {
      try {
        this.validarTimestampWebhook(dto.timestamp, "Webhook mock");
      } catch (e) {
        this.logger.logAuthenticationFailure("timestamp", dto.paymentId, null, {
          eventId: dto.eventId,
          timestamp: dto.timestamp,
          error: (e as Error).message,
        });
        throw e;
      }
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
  @Post("webhook/:gateway")
  @ApiOperation({
    summary: "Webhook de gateway de pagamento — sincronização de status",
    description:
      "Recebe notificações do gateway (ex.: mercadopago), valida a assinatura e atualiza o status do pagamento. Endpoint restrito a HTTPS.",
  })
  @ApiParam({
    name: "gateway",
    description: "Nome do gateway (ex.: mercadopago)",
    example: "mercadopago",
  })
  @ApiResponse({ status: 200, description: "Webhook processado" })
  @ApiResponse({ status: 404, description: "Gateway desconhecido" })
  @ApiResponse({ status: 403, description: "Assinatura de webhook inválida" })
  async gatewayWebhook(
    @Req() httpRequest: ExpressRequest,
    @Param("gateway") gatewayName: string,
    @Headers() headers: Record<string, string>,
    @Body() dto: unknown,
  ) {
    this.garantirRequestHttps(httpRequest);

    const gateway = this.gateways.getByName(gatewayName);
    if (!gateway) {
      throw new NotFoundException(
        `Gateway de pagamento desconhecido: ${gatewayName}`,
      );
    }

    return this.paymentsService.handleGatewayWebhook(gateway, headers, dto);
  }

  private garantirRequestHttps(req: ExpressRequest) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const protocoloForwarded = req.headers["x-forwarded-proto"];

    const protocolo =
      typeof protocoloForwarded === "string"
        ? protocoloForwarded.split(",")[0]?.trim()
        : req.protocol;

    if (protocolo !== "https") {
      this.logger.logAuthenticationFailure("replay", null, null, {
        path: req.path,
        protocol: protocolo,
        ip: req.ip,
      });
      throw new ForbiddenException("Webhook deve ser recebido via HTTPS");
    }
  }

  private validarTimestampWebhook(timestamp?: string, rotulo?: string) {
    if (!timestamp) {
      return;
    }

    const tsNumero = Number(timestamp);
    if (!Number.isFinite(tsNumero)) {
      throw new ForbiddenException(
        `${rotulo || "Webhook"}: timestamp inválido`,
      );
    }

    const JANELA_ACEITAVEL_S = 5 * 60;
    const agoraS = Math.floor(Date.now() / 1000);
    if (Math.abs(agoraS - tsNumero) > JANELA_ACEITAVEL_S) {
      throw new ForbiddenException(
        `${rotulo || "Webhook"}: timestamp fora da janela aceitável`,
      );
    }
  }
}
