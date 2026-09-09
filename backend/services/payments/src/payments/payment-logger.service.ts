import { Injectable } from "@nestjs/common";
import createLogger from "@pode-deixar/logger";
import { sanitizeSensitiveData } from "@pode-deixar/security";

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
      sanitizeSensitiveData({
        event: "payment.created",
        paymentId,
        orderId,
        amount,
        currency,
        method,
        idempotencyKey: idempotencyKey ?? undefined,
      }) as Record<string, unknown>,
      sanitizeSensitiveData(
        `Pagamento criado: ${paymentId} (order: ${orderId})`,
      ) as string,
    );
  }

  logPaymentStatusChange(
    paymentId: string,
    orderId: string,
    previousStatus: string,
    newStatus: string,
    actor: string,
    reason?: string,
  ) {
    this.logger.info(
      sanitizeSensitiveData({
        event: "payment.status_changed",
        paymentId,
        orderId,
        previousStatus,
        newStatus,
        actor,
        reason: reason ?? undefined,
      }) as Record<string, unknown>,
      sanitizeSensitiveData(
        `Status alterado: ${paymentId} ${previousStatus} -> ${newStatus} (${actor})`,
      ) as string,
    );
  }

  logWebhookReceived(
    paymentId: string | null,
    orderId: string | null,
    gateway: string,
    eventId: string,
    status: "sucesso" | "duplicado" | "falha",
    reason?: string,
  ) {
    this.logger.info(
      sanitizeSensitiveData({
        event: "payment.webhook_received",
        paymentId,
        orderId,
        gateway,
        eventId,
        status,
        reason: reason ?? undefined,
      }) as Record<string, unknown>,
      sanitizeSensitiveData(
        `Webhook ${gateway}: ${eventId} (${status})`,
      ) as string,
    );
  }

  logPaymentError(
    paymentId: string | null,
    orderId: string | null,
    error: string,
    context?: Record<string, unknown>,
  ) {
    this.logger.error(
      sanitizeSensitiveData({
        event: "payment.error",
        paymentId,
        orderId,
        error,
        ...context,
      }) as Record<string, unknown>,
      sanitizeSensitiveData(`Erro no pagamento: ${error}`) as string,
    );
  }

  logSuspiciousActivity(
    paymentId: string | null,
    orderId: string | null,
    kind: string,
    details: Record<string, unknown>,
  ) {
    this.logger.warn(
      sanitizeSensitiveData({
        event: "payment.suspicious",
        paymentId,
        orderId,
        kind,
        ...details,
      }) as Record<string, unknown>,
      sanitizeSensitiveData(`Atividade suspeita: ${kind}`) as string,
    );
  }

  logAuthenticationFailure(
    kind: "webhook_key" | "assinatura" | "timestamp" | "replay",
    paymentId: string | null,
    orderId: string | null,
    details: Record<string, unknown>,
  ) {
    this.logger.warn(
      sanitizeSensitiveData({
        event: "payment.auth_failure",
        kind,
        paymentId,
        orderId,
        ...details,
      }) as Record<string, unknown>,
      sanitizeSensitiveData(`Falha de autenticação: ${kind}`) as string,
    );
  }
}
