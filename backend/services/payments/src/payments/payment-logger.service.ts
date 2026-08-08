import { Injectable } from "@nestjs/common";
import createLogger from "@pode-deixar/logger";

@Injectable()
export class PaymentLoggerService {
  private readonly logger = createLogger("payments", "payment-events");

  logPaymentCreated(
    paymentId: string,
    orderId: string,
    amount: number,
    currency: string,
    method: string,
    idempotencyKey?: string,
  ) {
    this.logger.info(
      {
        event: "payment.created",
        paymentId,
        orderId,
        amount,
        currency,
        method,
        idempotencyKey: idempotencyKey ?? undefined,
      },
      `Pagamento criado: ${paymentId} (order: ${orderId})`,
    );
  }

  logPaymentStatusChange(
    paymentId: string,
    orderId: string,
    statusAnterior: string,
    statusNovo: string,
    actor: string,
    motivo?: string,
  ) {
    this.logger.info(
      {
        event: "payment.status_changed",
        paymentId,
        orderId,
        statusAnterior,
        statusNovo,
        actor,
        motivo: motivo ?? undefined,
      },
      `Status alterado: ${paymentId} ${statusAnterior} -> ${statusNovo} (${actor})`,
    );
  }

  logWebhookReceived(
    paymentId: string | null,
    orderId: string | null,
    gateway: string,
    eventId: string,
    status: "sucesso" | "duplicado" | "falha",
    motivo?: string,
  ) {
    this.logger.info(
      {
        event: "payment.webhook_received",
        paymentId,
        orderId,
        gateway,
        eventId,
        status,
        motivo: motivo ?? undefined,
      },
      `Webhook ${gateway}: ${eventId} (${status})`,
    );
  }

  logPaymentError(
    paymentId: string | null,
    orderId: string | null,
    error: string,
    contexto?: Record<string, unknown>,
  ) {
    this.logger.error(
      {
        event: "payment.error",
        paymentId,
        orderId,
        error,
        ...contexto,
      },
      `Erro no pagamento: ${error}`,
    );
  }

  logSuspiciousActivity(
    paymentId: string | null,
    orderId: string | null,
    tipo: string,
    detalhes: Record<string, unknown>,
  ) {
    this.logger.warn(
      {
        event: "payment.suspicious",
        paymentId,
        orderId,
        tipo,
        ...detalhes,
      },
      `Atividade suspeita: ${tipo}`,
    );
  }

  logAuthenticationFailure(
    tipo: "webhook_key" | "assinatura" | "timestamp" | "replay",
    paymentId: string | null,
    orderId: string | null,
    detalhes: Record<string, unknown>,
  ) {
    this.logger.warn(
      {
        event: "payment.auth_failure",
        tipo,
        paymentId,
        orderId,
        ...detalhes,
      },
      `Falha de autenticação: ${tipo}`,
    );
  }
}
