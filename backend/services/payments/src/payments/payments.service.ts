import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma, PaymentMethod, PaymentStatus } from "@prisma/client";
import { PrismaService } from "@pode-deixar/prisma";
import { PaymentGatewayFactory } from "../gateway/payment-gateway.factory";
import { PaymentGateway } from "../gateway/payment-gateway.interface";
import { PaymentLoggerService } from "./payment-logger.service";
import {
  CreatePaymentDto,
  SUPPORTED_CURRENCIES,
} from "./dto/create-payment.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";

const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED", "CANCELLED"],
  PAID: ["REFUNDED", "CANCELLED"],
  FAILED: ["CANCELLED"],
  CANCELLED: [],
  REFUNDED: [],
};

const MOCK_GATEWAY = "MOCK";

const DEFAULT_PLATFORM_FEE_RATE = 0.1;

const BRL_CURRENCY = "BRL";

interface WebhookEvent {
  gateway: string;
  eventId: string;
  paymentId?: string;
  payload?: unknown;
}

export interface WebhookResult {
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

  private async findClientPayment(paymentId: string, userId: string) {
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

  private get platformFeeRate(): number {
    const configuredRate = Number(process.env.PLATFORM_FEE_RATE);
    if (
      Number.isFinite(configuredRate) &&
      configuredRate >= 0 &&
      configuredRate < 1
    ) {
      return configuredRate;
    }
    return DEFAULT_PLATFORM_FEE_RATE;
  }

  private roundToCents(value: number): number {
    return Number(new Prisma.Decimal(value).toFixed(2));
  }

  private calculateFees(value: number) {
    const feeRate = this.platformFeeRate;
    const feeAmount = this.roundToCents(value * feeRate);
    const netAmount = this.roundToCents(value - feeAmount);
    return { feeRate, feeAmount, netAmount };
  }

  private calculateNetAmounts(
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
    const feeRate = Number(payment.feeRate ?? this.platformFeeRate);
    const feeAmount =
      payment.feeAmount != null
        ? Number(payment.feeAmount)
        : this.roundToCents(Number(payment.amount) * feeRate);
    const netAmount =
      payment.netAmount != null
        ? Number(payment.netAmount)
        : this.roundToCents(Number(payment.amount) - feeAmount);
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
    const payments = await this.findProviderPayments(userId);

    const totals = payments.reduce(
      (acc, payment) => {
        const { feeAmount, netAmount } = this.calculateNetAmounts(payment);
        const paidThisMonth =
          payment.status === "PAID" &&
          payment.paidAt &&
          this.isInCurrentMonth(payment.paidAt);

        if (payment.status === "PENDING") {
          acc.pendingNet += netAmount;
        }

        if (payment.status === "PAID") {
          acc.grossToReceive += Number(payment.amount);
          acc.feesOnToReceive += feeAmount;
          acc.toReceiveNet += netAmount;
        }

        if (paidThisMonth) {
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
      currency: BRL_CURRENCY,
      feeRate: this.platformFeeRate,
      ...totals,
    };
  }

  async getProviderFinanceItems(userId: string, status?: PaymentStatus) {
    const proposals = await this.findAcceptedProviderProposals(userId);
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

    const proposalByOrder = new Map(
      proposals.map((proposal) => [proposal.serviceOrderId, proposal.id]),
    );

    return payments.map((payment) =>
      this.formatFinanceItem(
        payment,
        proposalByOrder.get(payment.serviceOrderId),
      ),
    );
  }

  async getProviderFinanceChart(userId: string, months: number) {
    const startDate = this.startOfPeriod(months);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: startDate },
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

    const byMonth = new Map<
      string,
      { netReceived: number; feesRetained: number }
    >();

    for (const payment of payments) {
      const monthKey = this.monthKey(payment.paidAt);
      const { feeAmount, netAmount } = this.calculateNetAmounts(payment);
      const current = byMonth.get(monthKey) ?? {
        netReceived: 0,
        feesRetained: 0,
      };
      current.netReceived += netAmount;
      current.feesRetained += feeAmount;
      byMonth.set(monthKey, current);
    }

    return this.fillEmptyMonths(byMonth, months);
  }

  private async findAcceptedProviderProposals(userId: string) {
    return this.prisma.proposal.findMany({
      where: { providerId: userId, status: "ACCEPTED" },
      select: { id: true, serviceOrderId: true },
    });
  }

  private async findProviderPayments(userId: string) {
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
    const { feeRate, feeAmount, netAmount } = this.calculateNetAmounts(payment);

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

  private isInCurrentMonth(date: Date): boolean {
    const now = new Date();
    return (
      date.getUTCFullYear() === now.getUTCFullYear() &&
      date.getUTCMonth() === now.getUTCMonth()
    );
  }

  private startOfPeriod(months: number): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
    );
  }

  private monthKey(date: Date | null): string {
    if (!date) {
      return "";
    }
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private fillEmptyMonths(
    byMonth: Map<string, { netReceived: number; feesRetained: number }>,
    months: number,
  ) {
    const now = new Date();
    const result: {
      month: string;
      netReceived: number;
      feesRetained: number;
    }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const key = this.monthKey(date);
      result.push({
        month: key,
        netReceived: byMonth.get(key)?.netReceived ?? 0,
        feesRetained: byMonth.get(key)?.feesRetained ?? 0,
      });
    }

    return result;
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

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      throw new BadRequestException("Valor do pagamento inválido");
    }

    const currency = dto.currency ?? "BRL";
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new BadRequestException(
        `Moeda não suportada. Use: ${SUPPORTED_CURRENCIES.join(", ")}`,
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

    const existing = await this.findPaymentByIdempotency(
      order.id,
      dto.idempotencyKey,
    );

    if (existing) {
      return existing;
    }

    const fees = this.calculateFees(amountValue);

    // Always fill the idempotency key; the NOT NULL/unique migration is owned elsewhere.
    const idempotencyKey = dto.idempotencyKey ?? randomUUID();

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          serviceOrderId: order.id,
          amount: amountValue,
          currency,
          method: dto.method,
          status: "PENDING",
          feeRate: fees.feeRate,
          feeAmount: fees.feeAmount,
          netAmount: fees.netAmount,
          idempotencyKey,
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
      amountValue,
      currency,
      dto.method,
      idempotencyKey,
    );

    return payment;
  }

  private async findPaymentByIdempotency(
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
    const payment = await this.findClientPayment(paymentId, userId);

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

    // Claim-first: only one charge-race caller wins the claim; the rest see "already generated".
    const claimedRef = randomUUID();
    const claim = await this.prisma.payment.updateMany({
      where: { id: payment.id, externalRef: null },
      data: { externalRef: claimedRef },
    });

    if (claim.count === 0) {
      throw new BadRequestException(
        "Cobrança já gerada para este pagamento (idempotente)",
      );
    }

    try {
      return await this.createGatewayCharge(payment, gateway, claimedRef);
    } catch (error) {
      // Release the claim when the gateway fails so the charge can be retried.
      await this.prisma.payment.updateMany({
        where: { id: payment.id, externalRef: claimedRef },
        data: { externalRef: null },
      });
      throw error;
    }
  }

  async getStatus(userId: string, paymentId: string) {
    const payment = await this.findClientPayment(paymentId, userId);

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

  async confirmPayment(dto: PaymentWebhookDto): Promise<WebhookResult> {
    const alreadyProcessed = await this.findProcessedEvent(
      MOCK_GATEWAY,
      dto.eventId,
    );

    if (alreadyProcessed) {
      this.logger.logWebhookReceived(
        dto.paymentId,
        null,
        MOCK_GATEWAY,
        dto.eventId,
        "duplicado",
        "Evento já processado anteriormente",
      );
      return this.returnIdempotentPayment(
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
        { eventId: dto.eventId, gateway: MOCK_GATEWAY },
      );
      throw new NotFoundException("Webhook rejeitado");
    }

    try {
      this.verifyGatewayAmount(payment.amount, dto.amount);

      if (payment.status !== "PAID") {
        this.validateStatusTransition(payment.status, "PAID");
        this.validateScheduleForPayment(payment.serviceOrder.scheduledAt);
      }
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Validação do webhook falhou";
      this.logger.logWebhookReceived(
        dto.paymentId,
        null,
        MOCK_GATEWAY,
        dto.eventId,
        "falha",
        reason,
      );
      if (error instanceof BadRequestException) {
        throw new BadRequestException("Webhook rejeitado");
      }
      throw error;
    }

    const transaction = await this.attemptTransaction(
      {
        gateway: MOCK_GATEWAY,
        eventId: dto.eventId,
        paymentId: payment.id,
        payload: { externalId: dto.externalId },
      },
      async (tx) =>
        tx.payment.update({
          where: { id: dto.paymentId },
          data: {
            status: "PAID",
            paidAt: new Date(),
            externalRef: dto.externalId,
          },
        }),
    );

    if (transaction.duplicate) {
      this.logger.logWebhookReceived(
        dto.paymentId,
        null,
        MOCK_GATEWAY,
        dto.eventId,
        "duplicado",
        "Evento duplicado processado concorrentemente",
      );
      return this.returnIdempotentPayment(
        dto.paymentId,
        "Evento duplicado processado concorrentemente",
      );
    }

    this.logger.logWebhookReceived(
      dto.paymentId,
      payment.serviceOrderId,
      MOCK_GATEWAY,
      dto.eventId,
      "sucesso",
    );

    this.logger.logPaymentStatusChange(
      payment.id,
      payment.serviceOrderId,
      payment.status,
      "PAID",
      MOCK_GATEWAY,
      "Confirmação via webhook mock",
    );

    await this.recordStatusHistory(
      payment.id,
      payment.status,
      "PAID",
      MOCK_GATEWAY,
      "Confirmação via webhook mock",
    );

    return { payment: transaction.payment };
  }

  async handleGatewayWebhook(
    gateway: PaymentGateway,
    headers: Record<string, string | undefined>,
    body: unknown,
  ): Promise<WebhookResult> {
    if (!gateway.validateWebhook(headers, body)) {
      let logEventId = "desconhecido";
      try {
        logEventId = gateway.extractEventId(headers, body);
      } catch {
        // Generic log fallback to avoid leaking details; the invalid ID is already the rejection reason.
      }
      this.logger.logAuthenticationFailure("assinatura", null, null, {
        eventId: logEventId,
        gateway: gateway.name.toLowerCase(),
      });
      throw new ForbiddenException("Webhook rejeitado");
    }

    const eventId = gateway.extractEventId(headers, body);

    const alreadyProcessed = await this.findProcessedEvent(
      gateway.name,
      eventId,
    );

    if (alreadyProcessed) {
      this.logger.logWebhookReceived(
        alreadyProcessed.paymentId,
        null,
        gateway.name,
        eventId,
        "duplicado",
        "Webhook já processado (idempotente)",
      );
      return this.returnIdempotentPayment(
        alreadyProcessed.paymentId,
        "Webhook já processado (idempotente)",
      );
    }

    let gatewayPaymentId: string;
    try {
      gatewayPaymentId = gateway.extractGatewayPaymentId(body);
    } catch (error) {
      this.logger.logWebhookReceived(
        null,
        null,
        gateway.name,
        eventId,
        "falha",
        error instanceof Error ? error.message : "ID do gateway inválido",
      );
      throw new BadRequestException("Webhook rejeitado");
    }

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
      throw new NotFoundException("Webhook rejeitado");
    }

    let status: PaymentStatus;
    try {
      this.verifyGatewayAmount(
        payment.amount,
        gatewayPayment.transactionAmount,
      );

      status = gateway.translateStatus(gatewayPayment.status);

      if (payment.status !== status) {
        this.validateStatusTransition(payment.status, status);
        if (status === "PAID") {
          this.validateScheduleForPayment(payment.serviceOrder.scheduledAt);
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.logWebhookReceived(
          payment.id,
          null,
          gateway.name,
          eventId,
          "falha",
          error.message,
        );
        throw new BadRequestException("Webhook rejeitado");
      }
      throw error;
    }

    const transaction = await this.attemptTransaction(
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
      async (tx) =>
        tx.payment.update({
          where: { id: payment.id },
          data: {
            status,
            paidAt: status === "PAID" ? new Date() : null,
            externalRef: String(gatewayPayment.id),
          },
        }),
    );

    if (transaction.duplicate) {
      this.logger.logWebhookReceived(
        payment.id,
        payment.serviceOrderId,
        gateway.name,
        eventId,
        "duplicado",
        "Evento duplicado processado concorrentemente",
      );
      return this.returnIdempotentPayment(
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

    await this.recordStatusHistory(
      payment.id,
      payment.status,
      status,
      gateway.name,
      `Status do gateway: ${gatewayPayment.status}`,
    );

    return { payment: transaction.payment };
  }

  private async findProcessedEvent(gateway: string, eventId: string) {
    return this.prisma.paymentWebhookEvent.findUnique({
      where: { gateway_eventId: { gateway, eventId } },
    });
  }

  private async recordStatusHistory(
    paymentId: string,
    previousStatus: PaymentStatus | null,
    newStatus: PaymentStatus,
    actor: string,
    reason?: string,
  ) {
    await this.prisma.paymentStatusHistory.create({
      data: {
        paymentId,
        statusAnterior: previousStatus ?? undefined,
        statusNovo: newStatus,
        actor,
        motivo: reason,
      },
    });
  }

  private async returnIdempotentPayment(
    paymentId?: string | null,
    notice?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId || "" },
    });

    if (!payment) {
      throw new NotFoundException("Webhook rejeitado");
    }

    return { ...(notice ? { notice } : {}), payment };
  }

  private async attemptTransaction(
    event: WebhookEvent,
    update: (
      tx: Prisma.TransactionClient,
    ) => Promise<{ id: string; status: PaymentStatus }>,
  ) {
    try {
      // Claim-first: insert the event inside the transaction before any mutation; concurrent callers fail with P2002 without changing the payment.
      const payment = await this.prisma.$transaction(async (tx: any) => {
        await tx.paymentWebhookEvent.create({
          data: {
            gateway: event.gateway,
            eventId: event.eventId,
            paymentId: event.paymentId,
            payload: event.payload ?? undefined,
          },
        });
        return update(tx);
      });
      return { duplicate: false, payment };
    } catch (error) {
      const code =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : (error as { code?: string } | null)?.code;
      if (code === "P2002") {
        return { duplicate: true, payment: undefined as never };
      }
      throw error;
    }
  }

  private validateStatusTransition(
    current: PaymentStatus,
    next: PaymentStatus,
  ) {
    // Safe: the key is a PaymentStatus enum value.
    // eslint-disable-next-line security/detect-object-injection
    const allowed = VALID_TRANSITIONS[current] ?? [];

    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Transição de estado inválida: ${current} -> ${next}`,
      );
    }
  }

  private validateScheduleForPayment(scheduledAt: Date | null) {
    if (!scheduledAt) {
      throw new BadRequestException(
        "O pedido não possui data de agendamento — o checkout deve informar scheduledAt",
      );
    }
  }

  private verifyGatewayAmount(localAmount: unknown, gatewayAmount: number) {
    if (Number(localAmount) !== Number(gatewayAmount)) {
      throw new BadRequestException(
        "Valor informado pelo gateway não corresponde ao valor registrado",
      );
    }
  }

  private async createGatewayCharge(
    payment: { id: string; amount: unknown; method: PaymentMethod },
    gateway: PaymentGateway,
    claimedRef: string,
  ) {
    const charge = await gateway.createCharge({
      amount: Number(payment.amount),
      externalReference: payment.id,
      method: payment.method,
      description: `Pedido ${payment.id}`,
    });

    await this.prisma.payment.updateMany({
      where: { id: payment.id, externalRef: claimedRef },
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
