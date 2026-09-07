import { Injectable } from "@nestjs/common";
import createLogger from "@pode-deixar/logger";
import { sanitizarDadosSensiveis } from "@pode-deixar/security";

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
      sanitizarDadosSensiveis({
        event: "payment.created",
        paymentId,
        orderId,
        amount,
        currency,
        method,
        idempotencyKey: idempotencyKey ?? undefined,
      }) as Record<string, unknown>,
      sanitizarDadosSensiveis(
        `Pagamento criado: ${paymentId} (order: ${orderId})`,
      ) as string,
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
      sanitizarDadosSensiveis({
        event: "payment.status_changed",
        paymentId,
        orderId,
        statusAnterior,
        statusNovo,
        actor,
        motivo: motivo ?? undefined,
      }) as Record<string, unknown>,
      sanitizarDadosSensiveis(
        `Status alterado: ${paymentId} ${statusAnterior} -> ${statusNovo} (${actor})`,
      ) as string,
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
      sanitizarDadosSensiveis({
        event: "payment.webhook_received",
        paymentId,
        orderId,
        gateway,
        eventId,
        status,
        motivo: motivo ?? undefined,
      }) as Record<string, unknown>,
      sanitizarDadosSensiveis(
        `Webhook ${gateway}: ${eventId} (${status})`,
      ) as string,
    );
  }

  logPaymentError(
    paymentId: string | null,
    orderId: string | null,
    error: string,
    contexto?: Record<string, unknown>,
  ) {
    this.logger.error(
      sanitizarDadosSensiveis({
        event: "payment.error",
        paymentId,
        orderId,
        error,
        ...contexto,
      }) as Record<string, unknown>,
      sanitizarDadosSensiveis(`Erro no pagamento: ${error}`) as string,
    );
  }

  logSuspiciousActivity(
    paymentId: string | null,
    orderId: string | null,
    tipo: string,
    detalhes: Record<string, unknown>,
  ) {
    this.logger.warn(
      sanitizarDadosSensiveis({
        event: "payment.suspicious",
        paymentId,
        orderId,
        tipo,
        ...detalhes,
      }) as Record<string, unknown>,
      sanitizarDadosSensiveis(`Atividade suspeita: ${tipo}`) as string,
    );
  }

  logAuthenticationFailure(
    tipo: "webhook_key" | "assinatura" | "timestamp" | "replay",
    paymentId: string | null,
    orderId: string | null,
    detalhes: Record<string, unknown>,
  ) {
    this.logger.warn(
      sanitizarDadosSensiveis({
        event: "payment.auth_failure",
        tipo,
        paymentId,
        orderId,
        ...detalhes,
      }) as Record<string, unknown>,
      sanitizarDadosSensiveis(`Falha de autenticação: ${tipo}`) as string,
    );
  }
}
