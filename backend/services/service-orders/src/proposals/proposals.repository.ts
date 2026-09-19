// Proposals repository — data access for proposals and deduped service notifications

import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";

export interface CreateProposalData {
  serviceOrderId: string;
  providerId: string;
  // Prisma returns Decimal for price; accept it back on updates.
  price: any;
  description: string;
  estimatedDuration: string | null;
}

export interface UpdateProposalData {
  price: any;
  description: string;
  estimatedDuration: string | null;
}

@Injectable()
export class ProposalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrderById(orderId: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });
  }

  findActiveProposal(serviceOrderId: string, providerId: string) {
    return this.prisma.proposal.findFirst({
      where: {
        serviceOrderId,
        providerId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });
  }

  createProposal(data: CreateProposalData) {
    return this.prisma.proposal.create({
      data: {
        serviceOrderId: data.serviceOrderId,
        providerId: data.providerId,
        price: data.price,
        description: data.description,
        estimatedDuration: data.estimatedDuration,
      },
    });
  }

  findProposalWithOrderById(proposalId: string) {
    return this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        serviceOrder: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  findProposalsByProvider(providerId: string, skip: number, take: number) {
    return this.prisma.proposal.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        serviceOrder: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  findProposalsByOrder(serviceOrderId: string) {
    return this.prisma.proposal.findMany({
      where: { serviceOrderId },
      orderBy: { price: "asc" },
    });
  }

  findProposalById(proposalId: string) {
    return this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });
  }

  updateProposal(proposalId: string, data: UpdateProposalData) {
    return this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        price: data.price,
        description: data.description,
        estimatedDuration: data.estimatedDuration,
      },
    });
  }

  updateProposalStatus(
    proposalId: string,
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN",
  ) {
    return this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status },
    });
  }

  findProposalWithServiceOrder(proposalId: string) {
    return this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { serviceOrder: true },
    });
  }

  acceptProposal(
    proposalId: string,
    serviceOrderId: string,
    providerId: string,
    // Prisma returns Decimal for price; accept it back here.
    price: any,
  ) {
    return this.prisma.$transaction([
      this.prisma.proposal.update({
        where: { id: proposalId },
        data: { status: "ACCEPTED" },
      }),
      this.prisma.proposal.updateMany({
        where: {
          serviceOrderId,
          id: { not: proposalId },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      }),
      this.prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          status: "IN_PROGRESS",
          providerId,
          agreedPrice: price,
        },
      }),
    ]);
  }

  // --- Notifications (SERVICE) with dedup ---

  /**
   * Checks for a recent duplicate SERVICE notification.
   * Dedup key: same user + type + title + contractId within windowMs.
   */
  async existsRecent(opts: {
    userId: string;
    type: string;
    title: string;
    contractId?: string | null;
    windowMs?: number;
  }): Promise<boolean> {
    const windowMs = opts.windowMs ?? 60000;
    const since = new Date(Date.now() - windowMs);
    const where: Record<string, unknown> = {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      createdAt: { gte: since },
    };
    if (opts.contractId) {
      where.contractId = opts.contractId;
    }
    const existing = await this.prisma.notification.findFirst({ where });
    return Boolean(existing);
  }

  /**
   * Creates a SERVICE notification unless a duplicate exists within 60s.
   * Returns null when duplicate detected.
   */
  async notify(dto: {
    userId: string;
    type: string;
    title: string;
    message: string;
    contractId?: string | null;
  }) {
    const isDuplicate = await this.existsRecent({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      contractId: dto.contractId ?? null,
      windowMs: 60000,
    });
    if (isDuplicate) {
      return null;
    }
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        contractId: dto.contractId ?? null,
      },
    });
  }
}
