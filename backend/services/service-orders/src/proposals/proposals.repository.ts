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
}
