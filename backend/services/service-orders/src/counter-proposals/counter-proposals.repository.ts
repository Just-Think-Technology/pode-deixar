import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";

export interface CreateCounterProposalData {
  proposalId: string;
  senderId: string;
  // Prisma returns Decimal for price; accept it back on accept.
  price: any;
  description: string;
  estimatedDuration: string | null;
}

@Injectable()
export class CounterProposalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProposalWithOrder(proposalId: string) {
    return this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { serviceOrder: true },
    });
  }

  findPendingByProposalAndSender(proposalId: string, senderId: string) {
    return this.prisma.counterProposal.findFirst({
      where: {
        proposalId,
        senderId,
        status: "PENDING",
      },
    });
  }

  createCounterProposal(data: CreateCounterProposalData) {
    return this.prisma.counterProposal.create({
      data: {
        proposalId: data.proposalId,
        senderId: data.senderId,
        price: data.price,
        description: data.description,
        estimatedDuration: data.estimatedDuration,
      },
    });
  }

  findCounterProposalWithRelations(counterProposalId: string) {
    return this.prisma.counterProposal.findUnique({
      where: { id: counterProposalId },
      include: {
        proposal: {
          include: { serviceOrder: true },
        },
      },
    });
  }

  acceptCounterProposal(
    counterProposalId: string,
    proposalId: string,
    serviceOrderId: string,
    providerId: string,
    // Prisma returns Decimal for price; accept it back here.
    price: any,
  ) {
    return this.prisma.$transaction([
      this.prisma.counterProposal.update({
        where: { id: counterProposalId },
        data: { status: "ACCEPTED" },
      }),
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
      this.prisma.counterProposal.updateMany({
        where: {
          proposalId,
          id: { not: counterProposalId },
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

  updateCounterProposalStatus(
    counterProposalId: string,
    status: "PENDING" | "ACCEPTED" | "REJECTED",
  ) {
    return this.prisma.counterProposal.update({
      where: { id: counterProposalId },
      data: { status },
    });
  }

  findCounterProposalsByProposal(
    proposalId: string,
    skip: number,
    take: number,
  ) {
    return this.prisma.counterProposal.findMany({
      where: { proposalId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  findSentBySender(senderId: string, skip: number, take: number) {
    return this.prisma.counterProposal.findMany({
      where: { senderId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        proposal: {
          select: { id: true, serviceOrderId: true, price: true, status: true },
        },
      },
    });
  }
}
