import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

export interface CreatePaymentData {
  serviceOrderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  feeRate: number;
  feeAmount: number;
  netAmount: number;
  idempotencyKey: string;
  scheduledAt: Date;
  scheduledEndAt: Date | null;
}

export interface WebhookEventData {
  gateway: string;
  eventId: string;
  paymentId?: string;
  payload?: unknown;
}

export interface WebhookPaymentUpdate {
  paymentId: string;
  status: PaymentStatus;
  paidAt: Date | null;
  externalRef: string;
}

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPaymentWithClient(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { serviceOrder: { select: { clientId: true } } },
    });
  }

  findClientPayments(userId: string) {
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

  findOrderWithAcceptedProposal(orderId: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: {
        proposals: {
          where: { status: "ACCEPTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  }

  findPaymentByIdempotency(serviceOrderId: string, idempotencyKey: string) {
    return this.prisma.payment.findFirst({
      where: { serviceOrderId, idempotencyKey },
    });
  }

  createPayment(data: CreatePaymentData) {
    return this.prisma
      .$transaction([
        this.prisma.payment.create({
          data: {
            serviceOrderId: data.serviceOrderId,
            amount: data.amount,
            currency: data.currency,
            method: data.method,
            status: "PENDING",
            feeRate: data.feeRate,
            feeAmount: data.feeAmount,
            netAmount: data.netAmount,
            idempotencyKey: data.idempotencyKey,
          },
        }),
        this.prisma.serviceOrder.update({
          where: { id: data.serviceOrderId },
          data: {
            scheduledAt: data.scheduledAt,
            scheduledEndAt: data.scheduledEndAt,
          },
        }),
      ])
      .then(([payment]) => payment);
  }

  claimCharge(paymentId: string, claimedRef: string) {
    return this.prisma.payment.updateMany({
      where: { id: paymentId, externalRef: null },
      data: { externalRef: claimedRef },
    });
  }

  releaseChargeClaim(paymentId: string, claimedRef: string) {
    return this.prisma.payment.updateMany({
      where: { id: paymentId, externalRef: claimedRef },
      data: { externalRef: null },
    });
  }

  finalizeCharge(paymentId: string, claimedRef: string, externalRef: string) {
    return this.prisma.payment.updateMany({
      where: { id: paymentId, externalRef: claimedRef },
      data: { externalRef },
    });
  }

  findPaymentWithSchedule(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        serviceOrder: { select: { scheduledAt: true } },
      },
    });
  }

  findPaymentById(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
  }

  findProcessedEvent(gateway: string, eventId: string) {
    return this.prisma.paymentWebhookEvent.findUnique({
      where: { gateway_eventId: { gateway, eventId } },
    });
  }

  recordStatusHistory(
    paymentId: string,
    previousStatus: PaymentStatus | null,
    newStatus: PaymentStatus,
    actor: string,
    reason?: string,
  ) {
    return this.prisma.paymentStatusHistory.create({
      data: {
        paymentId,
        statusAnterior: previousStatus ?? undefined,
        statusNovo: newStatus,
        actor,
        motivo: reason,
      },
    });
  }

  applyWebhookEvent(event: WebhookEventData, update: WebhookPaymentUpdate) {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      await tx.paymentWebhookEvent.create({
        data: {
          gateway: event.gateway,
          eventId: event.eventId,
          paymentId: event.paymentId,
          payload: event.payload ?? undefined,
        },
      });
      return tx.payment.update({
        where: { id: update.paymentId },
        data: {
          status: update.status,
          paidAt: update.paidAt,
          externalRef: update.externalRef,
        },
      });
    });
  }

  findAcceptedProposals(userId: string) {
    return this.prisma.proposal.findMany({
      where: { providerId: userId, status: "ACCEPTED" },
      select: { id: true, serviceOrderId: true },
    });
  }

  findProviderPayments(userId: string) {
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

  findPaymentsByOrderIds(orderIds: string[], status?: PaymentStatus) {
    return this.prisma.payment.findMany({
      where: {
        serviceOrderId: { in: orderIds },
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findPaidPaymentsSince(userId: string, startDate: Date) {
    return this.prisma.payment.findMany({
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
  }
}
