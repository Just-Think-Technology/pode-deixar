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

  completeOrder(orderId: string) {
    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: "COMPLETED" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
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
}
