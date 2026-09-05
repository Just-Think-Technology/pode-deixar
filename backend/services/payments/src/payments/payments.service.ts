import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma, PaymentMethod, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentGatewayFactory } from "../gateway/payment-gateway.factory";
import { PaymentGateway } from "../gateway/payment-gateway.interface";
import { PaymentLoggerService } from "./payment-logger.service";
import { CreatePaymentDto, MOEDAS_SUPORTADAS } from "./dto/create-payment.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";

const TRANSICOES_VALIDAS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED", "CANCELLED"],
  PAID: ["REFUNDED", "CANCELLED"],
  FAILED: ["CANCELLED"],
  CANCELLED: [],
  REFUNDED: [],
};

const GATEWAY_MOCK = "MOCK";

const TAXA_PLATAFORMA_PADRAO = 0.1;

const MOEDA_BRL = "BRL";

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
    private readonly gateways: PaymentGatewayFactory,
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

  private get taxaPlataforma(): number {
    const configurada = Number(process.env.PLATFORM_FEE_RATE);
    if (Number.isFinite(configurada) && configurada >= 0 && configurada < 1) {
      return configurada;
    }
    return TAXA_PLATAFORMA_PADRAO;
  }

  private arredondarParaCentavos(valor: number): number {
    return Number(new Prisma.Decimal(valor).toFixed(2));
  }

  private calcularFees(valor: number) {
    const feeRate = this.taxaPlataforma;
    const feeAmount = this.arredondarParaCentavos(valor * feeRate);
    const netAmount = this.arredondarParaCentavos(valor - feeAmount);
    return { feeRate, feeAmount, netAmount };
  }

  private calcularLiquido(
    payment:
      | {
          amount: number;
          feeRate: number | null;
          feeAmount: number | null;
          netAmount: number | null;
        }
      | {
          amount: Prisma.Decimal;
          feeRate: Prisma.Decimal | null;
          feeAmount: Prisma.Decimal | null;
          netAmount: Prisma.Decimal | null;
        },
  ) {
    const feeRate = Number(payment.feeRate ?? this.taxaPlataforma);
    const feeAmount =
      payment.feeAmount != null
        ? Number(payment.feeAmount)
        : this.arredondarParaCentavos(Number(payment.amount) * feeRate);
    const netAmount =
      payment.netAmount != null
        ? Number(payment.netAmount)
        : this.arredondarParaCentavos(Number(payment.amount) - feeAmount);
    return { feeRate, feeAmount, netAmount };
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

  async getProviderFinanceSummary(userId: string) {
    const payments = await this.buscarPagamentosDoProvider(userId);

    const agregado = payments.reduce(
      (acc, payment) => {
        const { feeAmount, netAmount } = this.calcularLiquido(payment);
        const pagoNoMesAtual =
          payment.status === "PAID" &&
          payment.paidAt &&
          this.pertenceAoMesAtual(payment.paidAt);

        if (payment.status === "PENDING") {
          acc.pendingNet += netAmount;
        }

        if (payment.status === "PAID") {
          acc.grossToReceive += Number(payment.amount);
          acc.feesOnToReceive += feeAmount;
          acc.toReceiveNet += netAmount;
        }

        if (pagoNoMesAtual) {
          acc.receivedThisMonthNet += netAmount;
          acc.feesThisMonth += feeAmount;
        }

        return acc;
      },
      {
        pendingNet: 0,
        grossToReceive: 0,
        feesOnToReceive: 0,
        toReceiveNet: 0,
        receivedThisMonthNet: 0,
        feesThisMonth: 0,
      },
    );

    return {
      currency: MOEDA_BRL,
      feeRate: this.taxaPlataforma,
      ...agregado,
    };
  }

  async getProviderFinanceItems(userId: string, status?: PaymentStatus) {
    const proposals = await this.buscarProposalsAceitasDoProvider(userId);
    const orderIds = proposals.map((proposal) => proposal.serviceOrderId);

    if (orderIds.length === 0) {
      return [];
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        serviceOrderId: { in: orderIds },
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const proposalPorPedido = new Map(
      proposals.map((proposal) => [proposal.serviceOrderId, proposal.id]),
    );

    return payments.map((payment) =>
      this.formatFinanceItem(
        payment,
        proposalPorPedido.get(payment.serviceOrderId),
      ),
    );
  }

  async getProviderFinanceChart(userId: string, months: number) {
    const inicio = this.inicioDoPeriodo(months);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: inicio },
        serviceOrder: {
          proposals: {
            some: { providerId: userId, status: "ACCEPTED" },
          },
        },
      },
      select: {
        paidAt: true,
        feeRate: true,
        feeAmount: true,
        netAmount: true,
        amount: true,
      },
    });

    const porMes = new Map<
      string,
      { netReceived: number; feesRetained: number }
    >();

    for (const payment of payments) {
      const chaveMes = this.chaveDoMes(payment.paidAt);
      const { feeAmount, netAmount } = this.calcularLiquido(payment);
      const atual = porMes.get(chaveMes) ?? { netReceived: 0, feesRetained: 0 };
      atual.netReceived += netAmount;
      atual.feesRetained += feeAmount;
      porMes.set(chaveMes, atual);
    }

    return this.preencherMesesVazios(porMes, months);
  }

  private async buscarProposalsAceitasDoProvider(userId: string) {
    return this.prisma.proposal.findMany({
      where: { providerId: userId, status: "ACCEPTED" },
      select: { id: true, serviceOrderId: true },
    });
  }

  private async buscarPagamentosDoProvider(userId: string) {
    return this.prisma.payment.findMany({
      where: {
        serviceOrder: {
          proposals: {
            some: { providerId: userId, status: "ACCEPTED" },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private formatFinanceItem(
    payment:
      | {
          id: string;
          serviceOrderId: string;
          amount: Prisma.Decimal;
          status: PaymentStatus;
          method: PaymentMethod;
          feeRate: Prisma.Decimal | null;
          feeAmount: Prisma.Decimal | null;
          netAmount: Prisma.Decimal | null;
          paidAt: Date | null;
          createdAt: Date;
        }
      | {
          id: string;
          serviceOrderId: string;
          amount: number;
          status: PaymentStatus;
          method: PaymentMethod;
          feeRate: number | null;
          feeAmount: number | null;
          netAmount: number | null;
          paidAt: Date | null;
          createdAt: Date;
        },
    proposalId: string | undefined,
  ) {
    const { feeRate, feeAmount, netAmount } = this.calcularLiquido(payment);

    return {
      paymentId: payment.id,
      proposalId,
      serviceOrderId: payment.serviceOrderId,
      paymentStatus: payment.status,
      method: payment.method,
      grossAmount: Number(payment.amount),
      feeAmount,
      netAmount,
      feeRate,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  private pertenceAoMesAtual(data: Date): boolean {
    const agora = new Date();
    return (
      data.getUTCFullYear() === agora.getUTCFullYear() &&
      data.getUTCMonth() === agora.getUTCMonth()
    );
  }

  private inicioDoPeriodo(months: number): Date {
    const agora = new Date();
    return new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - (months - 1), 1),
    );
  }

  private chaveDoMes(data: Date | null): string {
    if (!data) {
      return "";
    }
    return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private preencherMesesVazios(
    porMes: Map<string, { netReceived: number; feesRetained: number }>,
    months: number,
  ) {
    const agora = new Date();
    const resultado: {
      month: string;
      netReceived: number;
      feesRetained: number;
    }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const data = new Date(
        Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - i, 1),
      );
      const chave = this.chaveDoMes(data);
      resultado.push({
        month: chave,
        netReceived: porMes.get(chave)?.netReceived ?? 0,
        feesRetained: porMes.get(chave)?.feesRetained ?? 0,
      });
    }

    return resultado;
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

    const scheduledAt = new Date(dto.scheduledAt);
    const scheduledEndAt = dto.scheduledEndAt
      ? new Date(dto.scheduledEndAt)
      : null;

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException("Data de agendamento inválida");
    }

    if (scheduledEndAt && Number.isNaN(scheduledEndAt.getTime())) {
      throw new BadRequestException("Data de término do agendamento inválida");
    }

    if (scheduledEndAt && scheduledEndAt <= scheduledAt) {
      throw new BadRequestException(
        "O término do agendamento deve ser posterior ao início",
      );
    }

    const existente = await this.buscarPagamentoPorIdempotencia(
      order.id,
      dto.idempotencyKey,
    );

    if (existente) {
      return existente;
    }

    const fees = this.calcularFees(valor);

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          serviceOrderId: order.id,
          amount: valor,
          currency,
          method: dto.method,
          status: "PENDING",
          feeRate: fees.feeRate,
          feeAmount: fees.feeAmount,
          netAmount: fees.netAmount,
          ...(dto.idempotencyKey ? { idempotencyKey: dto.idempotencyKey } : {}),
        },
      }),
      this.prisma.serviceOrder.update({
        where: { id: order.id },
        data: {
          scheduledAt,
          scheduledEndAt,
        },
      }),
    ]);

    this.logger.logPaymentCreated(
      payment.id,
      order.id,
      valor,
      currency,
      dto.method,
      dto.idempotencyKey,
    );

    return payment;
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

    const gateway =
      payment.method === PaymentMethod.PIX
        ? this.gateways.active
        : this.gateways.mock;

    return this.gerarCobranca(payment, gateway);
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
      include: {
        serviceOrder: { select: { scheduledAt: true } },
      },
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
      this.validarAgendamentoParaPagamento(payment.serviceOrder.scheduledAt);
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

  async handleGatewayWebhook(
    gateway: PaymentGateway,
    headers: Record<string, string | undefined>,
    body: unknown,
  ): Promise<ResultadoWebhook> {
    if (!gateway.validateWebhook(headers, body)) {
      this.logger.logAuthenticationFailure("assinatura", null, null, {
        eventId: gateway.extractEventId(headers, body),
        gateway: gateway.name.toLowerCase(),
      });
      throw new ForbiddenException("Assinatura de webhook inválida");
    }

    const eventId = gateway.extractEventId(headers, body);

    const jaProcessado = await this.eventoJaProcessado(gateway.name, eventId);

    if (jaProcessado) {
      this.logger.logWebhookReceived(
        jaProcessado.paymentId,
        null,
        gateway.name,
        eventId,
        "duplicado",
        "Webhook já processado (idempotente)",
      );
      return this.retornarPagamentoIdempotente(
        jaProcessado.paymentId,
        "Webhook já processado (idempotente)",
      );
    }

    const gatewayPaymentId = gateway.extractGatewayPaymentId(body);
    const gatewayPayment = await gateway.getPayment(gatewayPaymentId);

    const payment = await this.prisma.payment.findUnique({
      where: { id: gatewayPayment.externalReference || "" },
      include: {
        serviceOrder: { select: { scheduledAt: true } },
      },
    });

    if (!payment) {
      this.logger.logPaymentError(
        gatewayPayment.externalReference ?? null,
        null,
        "Pagamento local não encontrado",
        {
          gatewayId: gatewayPayment.id,
          gatewayStatus: gatewayPayment.status,
          eventId,
        },
      );
      throw new NotFoundException(
        `Pagamento ${gatewayPayment.externalReference} não encontrado`,
      );
    }

    this.conferirValorGateway(payment.amount, gatewayPayment.transactionAmount);

    const status = gateway.translateStatus(gatewayPayment.status);

    if (payment.status !== status) {
      this.validarTransicaoEstado(payment.status, status);
      if (status === "PAID") {
        this.validarAgendamentoParaPagamento(payment.serviceOrder.scheduledAt);
      }
    }

    const transacao = await this.tentarTransacao(
      {
        gateway: gateway.name,
        eventId,
        paymentId: payment.id,
        payload: {
          gatewayId: String(gatewayPayment.id),
          statusGateway: status,
          gatewayStatus: gatewayPayment.status,
        },
      },
      async () =>
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status,
            paidAt: status === "PAID" ? new Date() : null,
            externalRef: String(gatewayPayment.id),
          },
        }),
    );

    if (transacao.duplicado) {
      this.logger.logWebhookReceived(
        payment.id,
        payment.serviceOrderId,
        gateway.name,
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
      gateway.name,
      eventId,
      "sucesso",
    );

    this.logger.logPaymentStatusChange(
      payment.id,
      payment.serviceOrderId,
      payment.status,
      status,
      gateway.name,
      `Status do gateway: ${gatewayPayment.status}`,
    );

    await this.registrarHistoricoStatus(
      payment.id,
      payment.status,
      status,
      gateway.name,
      `Status do gateway: ${gatewayPayment.status}`,
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

  private validarAgendamentoParaPagamento(scheduledAt: Date | null) {
    if (!scheduledAt) {
      throw new BadRequestException(
        "O pedido não possui data de agendamento — o checkout deve informar scheduledAt",
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

  private async gerarCobranca(
    payment: { id: string; amount: unknown; method: PaymentMethod },
    gateway: PaymentGateway,
  ) {
    const charge = await gateway.createCharge({
      amount: Number(payment.amount),
      externalReference: payment.id,
      method: payment.method,
      description: `Pedido ${payment.id}`,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { externalRef: String(charge.id) },
    });

    return {
      paymentId: payment.id,
      chargeRef: String(charge.id),
      status: "PENDING",
      cobranca: charge.cobranca,
    };
  }
}
