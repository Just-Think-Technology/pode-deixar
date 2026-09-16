import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";

export interface CreateServiceOrderData {
  clientId: string;
  providerId: string | null;
  title: string;
  description: string;
  categoryId: string;
  // Prisma returns Decimal for monetary fields; accept it back on updates.
  budgetMin: any;
  budgetMax: any;
  address?: Record<string, string>;
}

export interface UpdateServiceOrderData {
  title: string;
  description: string;
  categoryId: string;
  budgetMin: any;
  budgetMax: any;
}

export interface CreateHiredOrderData {
  clientId: string;
  providerId: string;
  providerServiceId: string;
  agreedPrice: any;
  title: string;
  description: string;
  categoryId: string;
  address?: Record<string, string>;
}

@Injectable()
export class ServiceOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProviderUserById(providerId: string) {
    return this.prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true, role: true },
    });
  }

  createOrder(data: CreateServiceOrderData) {
    const { address, ...rest } = data;
    return this.prisma.serviceOrder.create({
      data: {
        ...rest,
        ...(address ? { address: address } : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  findReceivedByProvider(providerId: string, skip: number, take: number) {
    return this.prisma.serviceOrder.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  findByClient(clientId: string, skip: number, take: number) {
    return this.prisma.serviceOrder.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  findOrderWithProposalsById(id: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        proposals: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  findOrderWithAccessById(id: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        proposals: true,
        photos: {
          select: { id: true, url: true },
          orderBy: { createdAt: "asc" },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  findOpenOrders(callerUserId: string, skip: number, take: number) {
    return this.prisma.serviceOrder.findMany({
      where: {
        status: "OPEN",
        OR: [{ providerId: null }, { providerId: callerUserId }],
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  findOrderById(id: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id },
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, completeName: true },
    });
  }

  countPhotosByOrderId(orderId: string) {
    return this.prisma.orderPhoto.count({
      where: { serviceOrderId: orderId },
    });
  }

  findPhotosByOrderId(orderId: string) {
    return this.prisma.orderPhoto.findMany({
      where: { serviceOrderId: orderId },
      orderBy: { createdAt: "asc" },
      select: { id: true, url: true, createdAt: true },
    });
  }

  updateOrder(orderId: string, data: UpdateServiceOrderData) {
    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  cancelOrder(orderId: string) {
    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  completeOrder(
    orderId: string,
    completedBy: string,
    observations: string | null,
  ) {
    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy,
        observations,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  createCompletionNotification(recipient: string, orderId: string) {
    return this.prisma.notification.create({
      data: {
        recipient,
        type: "ORDER_COMPLETED",
        title: "Serviço concluído",
        message: "Seu serviço foi concluído pelo prestador",
        relatedId: orderId,
        relatedType: "service_order",
      },
    });
  }

  findProviderServiceById(id: string) {
    return this.prisma.providerService.findUnique({
      where: { id },
      include: {
        providerProfile: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  createHiredOrder(data: CreateHiredOrderData) {
    const { address, ...rest } = data;
    return this.prisma.serviceOrder.create({
      data: {
        ...rest,
        status: "IN_PROGRESS",
        ...(address ? { address: address } : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  findProviderAgenda(providerId: string, fromDate: Date, toDate: Date) {
    return this.prisma.serviceOrder.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "COMPLETED"] },
        scheduledAt: { gte: fromDate, lte: toDate },
        payments: { some: { status: "PAID" } },
        OR: [
          { providerId },
          {
            proposals: { some: { providerId, status: "ACCEPTED" } },
          },
        ],
      },
      include: {
        photos: {
          select: { id: true, url: true },
          orderBy: { createdAt: "asc" },
        },
        payments: {
          where: { status: "PAID" },
          orderBy: { paidAt: "desc" },
          take: 1,
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }

  startOrder(orderId: string, _actorId: string) {
    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { startedAt: new Date() },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  cancelWithReason(orderId: string, reason: string | null) {
    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  createTimelineEvent(
    orderId: string,
    eventKey: string,
    from: string | null,
    to: string | null,
    actorId: string | null,
  ) {
    return this.prisma.orderTimelineEvent.create({
      data: {
        serviceOrderId: orderId,
        eventKey,
        fromStatus: from,
        toStatus: to,
        actorId,
      },
    });
  }

  findOrderTrackingById(id: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        proposals: true,
        photos: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        reviews: { take: 1, orderBy: { createdAt: "desc" } },
        timelineEvents: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  findPaymentsByOrderId(orderId: string) {
    return this.prisma.payment.findMany({
      where: { serviceOrderId: orderId },
      orderBy: { createdAt: "desc" },
    });
  }

  findReviewsByOrderId(orderId: string) {
    return this.prisma.review.findMany({
      where: { serviceOrderId: orderId },
      orderBy: { createdAt: "desc" },
    });
  }
}
