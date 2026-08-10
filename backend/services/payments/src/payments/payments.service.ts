import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma, PaymentMethod, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MercadoPagoService } from "../mercadopago/mercadopago.service";
import { PaymentLoggerService } from "./payment-logger.service";
import { CreatePaymentDto, MOEDAS_SUPORTADAS } from "./dto/create-payment.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";
import { MercadoPagoWebhookDto } from "./dto/mercadopago-webhook.dto";

const TRANSICOES_VALIDAS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED", "CANCELLED"],
  PAID: ["REFUNDED", "CANCELLED"],
  FAILED: ["CANCELLED"],
  CANCELLED: [],
  REFUNDED: [],
};

const GATEWAY_MOCK = "MOCK";
const GATEWAY_MERCADO_PAGO = "MERCADO_PAGO";

interface EventoWebhook {
  gateway: string;
  eventId: string;
  paymentId?: string;
  payload?: unknown;
}

export interface ResultadoWebhook {
  payment: {
    id: string;
    status: PaymentStatus;
  };
  notice?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
    private readonly logger: PaymentLoggerService,
  ) {}

  private async buscarPagamentoDentroDoModelo(
    paymentId: string,
    userId: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { serviceOrder: { select: { clientId: true } } },
    });

    if (!payment) {
      throw new NotFoundException(`Pagamento ${paymentId} não encontrado`);
    }

    if (payment.serviceOrder.clientId !== userId) {
      throw new ForbiddenException(
        "Pagamento não pertence a um pedido deste cliente",
      );
    }

    return payment;
  }

  findAll(userId: string) {
    return this.prisma.payment.findMany({
      where: { serviceOrder: { clientId: userId } },
      include: {
        serviceOrder: {
          select: {
            id: true,
            title: true,
            clientId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(userId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: dto.serviceOrderId },
      include: {
        proposals: {
          where: { status: "ACCEPTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Pedido ${dto.serviceOrderId} não encontrado`,
      );
    }

    if (order.clientId !== userId) {
      throw new ForbiddenException("Este pedido não pertence a este cliente");
    }

    if (order.status === "CANCELLED") {
      throw new BadRequestException(
        "Não é possível criar pagamento para um pedido cancelado",
      );
    }

    const amount = order.agreedPrice ?? order.proposals[0]?.price ?? null;

    if (amount === null) {
      throw new BadRequestException(
        "Pedido não possui preço definido (proposta aceita não encontrada)",
      );
    }

    const valor = Number(amount);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new BadRequestException("Valor do pagamento inválido");
    }

    const currency = dto.currency ?? "BRL";
    if (!MOEDAS_SUPORTADAS.includes(currency)) {
      throw new BadRequestException(
        `Moeda não suportada. Use: ${MOEDAS_SUPORTADAS.join(", ")}`,
      );
    }

    const existente = await this.buscarPagamentoPorIdempotencia(
      order.id,
      dto.idempotencyKey,
    );

    if (existente) {
      return existente;
    }

    return this.prisma.payment
      .create({
        data: {
          serviceOrderId: order.id,
          amount: valor,
          currency,
          method: dto.method,
          status: "PENDING",
          ...(dto.idempotencyKey ? { idempotencyKey: dto.idempotencyKey } : {}),
        },
      })
      .then((payment) => {
        this.logger.logPaymentCreated(
          payment.id,
          order.id,
          valor,
          currency,
          dto.method,
          dto.idempotencyKey,
        );
        return payment;
      });
  }

  private async buscarPagamentoPorIdempotencia(
    serviceOrderId: string,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      return null;
    }

    return this.prisma.payment.findFirst({
      where: { serviceOrderId, idempotencyKey },
    });
  }

  async generateCharge(userId: string, paymentId: string) {
    const payment = await this.buscarPagamentoDentroDoModelo(paymentId, userId);

    if (payment.status !== "PENDING") {
      throw new BadRequestException(
        "Cobrança só pode ser gerada para pagamento pendente",
      );
    }

    if (payment.externalRef) {
      throw new BadRequestException(
        "Cobrança já gerada para este pagamento (idempotente)",
      );
    }

    if (this.mercadoPago.isConfigured && payment.method === PaymentMethod.PIX) {
      return this.gerarCobrancaMercadoPago(payment);
    }

    return this.gerarCobrancaMock(payment);
  }

  async getStatus(userId: string, paymentId: string) {
    const payment = await this.buscarPagamentoDentroDoModelo(paymentId, userId);

    return {
      paymentId: payment.id,
      serviceOrderId: payment.serviceOrderId,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      externalRef: payment.externalRef,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  async confirmPayment(dto: PaymentWebhookDto): Promise<ResultadoWebhook> {
    const jaProcessado = await this.eventoJaProcessado(
      GATEWAY_MOCK,
      dto.eventId,
    );

    if (jaProcessado) {
      this.logger.logWebhookReceived(
        dto.paymentId,
        null,
        GATEWAY_MOCK,
        dto.eventId,
        "duplicado",
        "Evento já processado anteriormente",
      );
      return this.retornarPagamentoIdempotente(
        dto.paymentId,
        "Pagamento confirmado anteriormente (evento duplicado)",
      );
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      this.logger.logPaymentError(
        dto.paymentId,
        null,
        "Pagamento não encontrado",
        { eventId: dto.eventId, gateway: GATEWAY_MOCK },
      );
      throw new NotFoundException(`Pagamento ${dto.paymentId} não encontrado`);
    }

    this.conferirValorGateway(payment.amount, dto.amount);

    if (payment.status !== "PAID") {
      this.validarTransicaoEstado(payment.status, "PAID");
    }

    const transacao = await this.tentarTransacao(
      {
        gateway: GATEWAY_MOCK,
        eventId: dto.eventId,
        paymentId: payment.id,
        payload: { externalId: dto.externalId },
      },
      async () =>
        this.prisma.payment.update({
          where: { id: dto.paymentId },
          data: {
            status: "PAID",
            paidAt: new Date(),
            externalRef: dto.externalId,
          },
        }),
    );

    if (transacao.duplicado) {
      this.logger.logWebhookReceived(
        dto.paymentId,
        null,
        GATEWAY_MOCK,
        dto.eventId,
        "duplicado",
        "Evento duplicado processado concorrentemente",
      );
      return this.retornarPagamentoIdempotente(
        dto.paymentId,
        "Evento duplicado processado concorrentemente",
      );
    }

    this.logger.logWebhookReceived(
      dto.paymentId,
      payment.serviceOrderId,
      GATEWAY_MOCK,
      dto.eventId,
      "sucesso",
    );

    this.logger.logPaymentStatusChange(
      payment.id,
      payment.serviceOrderId,
      payment.status,
      "PAID",
      GATEWAY_MOCK,
      "Confirmação via webhook mock",
    );

    await this.registrarHistoricoStatus(
      payment.id,
      payment.status,
      "PAID",
      GATEWAY_MOCK,
      "Confirmação via webhook mock",
    );

    return { payment: transacao.pagamento };
  }

  async handleMercadoPagoWebhook(
    dto: MercadoPagoWebhookDto,
    eventId: string,
  ): Promise<ResultadoWebhook> {
    const jaProcessado = await this.eventoJaProcessado(
      GATEWAY_MERCADO_PAGO,
      eventId,
    );

    if (jaProcessado) {
      this.logger.logWebhookReceived(
        jaProcessado.paymentId,
        null,
        GATEWAY_MERCADO_PAGO,
        eventId,
        "duplicado",
        "Webhook já processado (idempotente)",
      );
      return this.retornarPagamentoIdempotente(
        jaProcessado.paymentId,
        "Webhook do Mercado Pago já processado (idempotente)",
      );
    }

    const mpPayment = await this.mercadoPago.getPayment(dto.data.id);

    const payment = await this.prisma.payment.findUnique({
      where: { id: mpPayment.externalReference || "" },
    });

    if (!payment) {
      this.logger.logPaymentError(
        mpPayment.externalReference ?? null,
        null,
        "Pagamento local não encontrado",
        { gatewayId: mpPayment.id, gatewayStatus: mpPayment.status, eventId },
      );
      throw new NotFoundException(
        `Pagamento ${mpPayment.externalReference} não encontrado`,
      );
    }

    this.conferirValorGateway(payment.amount, mpPayment.transactionAmount);

    const status = this.traduzirStatusMercadoPago(mpPayment.status);

    if (payment.status !== status) {
      this.validarTransicaoEstado(payment.status, status);
    }

    const transacao = await this.tentarTransacao(
      {
        gateway: GATEWAY_MERCADO_PAGO,
        eventId,
        paymentId: payment.id,
        payload: {
          gatewayId: String(mpPayment.id),
          statusGateway: status,
          gatewayStatus: mpPayment.status,
        },
      },
      async () =>
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status,
            paidAt: status === "PAID" ? new Date() : null,
            externalRef: String(mpPayment.id),
          },
        }),
    );

    if (transacao.duplicado) {
      this.logger.logWebhookReceived(
        payment.id,
        payment.serviceOrderId,
        GATEWAY_MERCADO_PAGO,
        eventId,
        "duplicado",
        "Evento duplicado processado concorrentemente",
      );
      return this.retornarPagamentoIdempotente(
        payment.id,
        "Webhook com event_id já registrado (concorrência)",
      );
    }

    this.logger.logWebhookReceived(
      payment.id,
      payment.serviceOrderId,
      GATEWAY_MERCADO_PAGO,
      eventId,
      "sucesso",
    );

    this.logger.logPaymentStatusChange(
      payment.id,
      payment.serviceOrderId,
      payment.status,
      status,
      GATEWAY_MERCADO_PAGO,
      `Status do gateway: ${mpPayment.status}`,
    );

    await this.registrarHistoricoStatus(
      payment.id,
      payment.status,
      status,
      GATEWAY_MERCADO_PAGO,
      `Status do gateway: ${mpPayment.status}`,
    );

    return { payment: transacao.pagamento };
  }

  private async eventoJaProcessado(gateway: string, eventId: string) {
    return this.prisma.paymentWebhookEvent.findUnique({
      where: { gateway_eventId: { gateway, eventId } },
    });
  }

  private async registrarHistoricoStatus(
    paymentId: string,
    statusAnterior: PaymentStatus | null,
    statusNovo: PaymentStatus,
    actor: string,
    motivo?: string,
  ) {
    await this.prisma.paymentStatusHistory.create({
      data: {
        paymentId,
        statusAnterior: statusAnterior ?? undefined,
        statusNovo,
        actor,
        motivo,
      },
    });
  }

  private async retornarPagamentoIdempotente(
    paymentId?: string | null,
    mensagem?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId || "" },
    });

    if (!payment) {
      throw new NotFoundException(`Pagamento ${paymentId} não encontrado`);
    }

    return { ...(mensagem ? { notice: mensagem } : {}), payment };
  }

  private async tentarTransacao(
    evento: EventoWebhook,
    atualizar: () => Promise<{ id: string; status: PaymentStatus }>,
  ) {
    const pagamento = await atualizar();

    try {
      await this.prisma.paymentWebhookEvent.create({
        data: {
          gateway: evento.gateway,
          eventId: evento.eventId,
          paymentId: evento.paymentId,
          payload: evento.payload ?? undefined,
        },
      });
      return { duplicado: false, pagamento };
    } catch (erro) {
      const codigo =
        erro instanceof Prisma.PrismaClientKnownRequestError
          ? erro.code
          : (erro as { code?: string } | null)?.code;
      if (codigo === "P2002") {
        return { duplicado: true, pagamento: undefined as never };
      }
      throw erro;
    }
  }

  private validarTransicaoEstado(atual: PaymentStatus, novo: PaymentStatus) {
    // eslint-disable-next-line security/detect-object-injection
    const permitidas = TRANSICOES_VALIDAS[atual] ?? [];

    if (!permitidas.includes(novo)) {
      throw new BadRequestException(
        `Transição de estado inválida: ${atual} -> ${novo}`,
      );
    }
  }

  private conferirValorGateway(valorLocal: unknown, valorGateway: number) {
    if (Number(valorLocal) !== Number(valorGateway)) {
      throw new BadRequestException(
        "Valor informado pelo gateway não corresponde ao valor registrado",
      );
    }
  }

  private async gerarCobrancaMercadoPago(payment: {
    id: string;
    amount: unknown;
    method: PaymentMethod;
  }) {
    const notificationUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL;

    const charge = await this.mercadoPago.createPixCharge({
      amount: Number(payment.amount),
      externalReference: payment.id,
      payerEmail:
        process.env.MERCADO_PAGO_PAYER_EMAIL || "sandbox@pode-deixar.com",
      notificationUrl,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { externalRef: String(charge.id) },
    });

    return {
      paymentId: payment.id,
      chargeRef: String(charge.id),
      status: "PENDING",
      cobranca: {
        pixCopiaECola: charge.qrCode,
        qrCodeBase64: charge.qrCodeBase64,
        mercadoPagoId: charge.id,
      },
    };
  }

  private async gerarCobrancaMock(payment: {
    id: string;
    amount: unknown;
    method: string;
  }) {
    const chargeRef = `chg_mock_${payment.id.replace(/-/g, "").slice(0, 12)}`;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { externalRef: chargeRef },
    });

    return {
      paymentId: payment.id,
      chargeRef,
      status: "PENDING",
      cobranca: this.gerarCobrancaMockDetail(payment.method, chargeRef),
    };
  }

  private gerarCobrancaMockDetail(method: string, chargeRef: string) {
    if (method === PaymentMethod.PIX) {
      return {
        pixCopiaECola: `00020126580014br.gov.bcb.pix0136${chargeRef}5204000053039865406150.005802BR5913PODE-DEIXAR6009SAO PAULO`,
      };
    }

    return {
      linkCheckout: `https://checkout.mock.pode-deixar.com/${chargeRef}`,
    };
  }

  private traduzirStatusMercadoPago(mpStatus: string): PaymentStatus {
    const mapa: Record<string, PaymentStatus> = {
      approved: "PAID",
      pending: "PENDING",
      in_process: "PENDING",
      rejected: "FAILED",
      cancelled: "CANCELLED",
      refunded: "REFUNDED",
    };

    // eslint-disable-next-line security/detect-object-injection
    return mapa[mpStatus] || "PENDING";
  }
}
