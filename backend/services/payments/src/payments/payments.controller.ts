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
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";
import { PaymentLoggerService } from "./payment-logger.service";

@ApiTags("Payments")
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
  @ApiOperation({ summary: "List payments of the authenticated client" })
  @ApiResponse({ status: 200, description: "Payments list returned" })
  findAll(@Request() req: any) {
    return this.paymentsService.findAll(req.user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Register payment transaction in the database" })
  @ApiResponse({ status: 201, description: "Payment registered (PENDING)" })
  @ApiResponse({ status: 400, description: "Invalid data" })
  @ApiResponse({ status: 403, description: "Order does not belong to client" })
  create(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(req.user.sub, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(":paymentId/charge")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Generate charge after proposal acceptance (mock or gateway)",
    description:
      "Generates a charge via Mercado Pago (PIX) when configured; otherwise returns mocked data.",
  })
  @ApiParam({ name: "paymentId", description: "Payment ID" })
  @ApiResponse({ status: 200, description: "Charge generated" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  @ApiResponse({ status: 400, description: "Payment is not pending" })
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
  @ApiOperation({ summary: "Get payment status" })
  @ApiParam({ name: "paymentId", description: "Payment ID" })
  @ApiResponse({ status: 200, description: "Payment status returned" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  @ApiResponse({
    status: 403,
    description: "Payment does not belong to client",
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
    summary: "Webhook (mock) — confirm received payment",
    description:
      "Simulates the payment gateway callback and marks the payment as PAID. Restricted to HTTPS.",
  })
  @ApiResponse({ status: 200, description: "Payment confirmed (PAID)" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  @ApiResponse({ status: 403, description: "Invalid webhook key" })
  async webhook(
    @Req() httpRequest: ExpressRequest,
    @Headers("x-webhook-key") webhookKey: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException("Webhook mock indisponível em produção");
    }

    this.ensureHttpsRequest(httpRequest);

    if (!this.validateWebhookKey(webhookKey)) {
      this.logger.logAuthenticationFailure("webhook_key", dto.paymentId, null, {
        eventId: dto.eventId,
        providedKey: webhookKey ? "[REDACTED]" : "missing",
      });
      throw new ForbiddenException("Webhook rejeitado");
    }

    try {
      this.validateWebhookTimestamp(dto.timestamp, "Webhook mock");
    } catch (e) {
      this.logger.logAuthenticationFailure("timestamp", dto.paymentId, null, {
        eventId: dto.eventId,
        timestamp: dto.timestamp,
        error: (e as Error).message,
      });
      throw new ForbiddenException("Webhook rejeitado");
    }

    return this.paymentsService.confirmPayment(dto);
  }

  private validateWebhookKey(webhookKey: string | undefined): boolean {
    const expected = process.env.MOCK_WEBHOOK_KEY || "";
    if (!webhookKey || !expected) {
      return false;
    }
    // Compare hashes to avoid leaking key length.
    const a = crypto.createHash("sha256").update(webhookKey).digest();
    const b = crypto.createHash("sha256").update(expected).digest();
    return crypto.timingSafeEqual(a, b);
  }
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post("webhook/:gateway")
  @ApiOperation({
    summary: "Payment gateway webhook — status sync",
    description:
      "Receives gateway notifications (e.g. mercadopago), validates the signature and updates the payment status. Restricted to HTTPS.",
  })
  @ApiParam({
    name: "gateway",
    description: "Gateway name (e.g. mercadopago)",
    example: "mercadopago",
  })
  @ApiResponse({ status: 200, description: "Webhook processed" })
  @ApiResponse({ status: 404, description: "Unknown gateway" })
  @ApiResponse({ status: 403, description: "Invalid webhook signature" })
  async gatewayWebhook(
    @Req() httpRequest: ExpressRequest,
    @Param("gateway") gatewayName: string,
    @Headers() headers: Record<string, string>,
    @Body() dto: unknown,
  ) {
    this.ensureHttpsRequest(httpRequest);

    const gateway = this.gateways.getByName(gatewayName);
    if (!gateway) {
      throw new NotFoundException(
        `Gateway de pagamento desconhecido: ${gatewayName}`,
      );
    }

    return this.paymentsService.handleGatewayWebhook(gateway, headers, dto);
  }

  private ensureHttpsRequest(req: ExpressRequest) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const forwardedProtocol = req.headers["x-forwarded-proto"];

    const protocol =
      typeof forwardedProtocol === "string"
        ? forwardedProtocol.split(",")[0]?.trim()
        : req.protocol;

    if (protocol !== "https") {
      this.logger.logAuthenticationFailure("replay", null, null, {
        path: req.path,
        protocol,
        ip: req.ip,
      });
      throw new ForbiddenException("Webhook deve ser recebido via HTTPS");
    }
  }

  private validateWebhookTimestamp(timestamp: string, label?: string) {
    const tsNumber = Number(timestamp);
    if (!Number.isFinite(tsNumber)) {
      throw new ForbiddenException(`${label || "Webhook"}: timestamp inválido`);
    }

    const ACCEPTABLE_WINDOW_S = 5 * 60;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - tsNumber) > ACCEPTABLE_WINDOW_S) {
      throw new ForbiddenException(
        `${label || "Webhook"}: timestamp fora da janela aceitável`,
      );
    }
  }
}
