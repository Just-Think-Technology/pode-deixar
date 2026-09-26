// Proposals repository — data access for proposals and deduped service notifications

import { Inject, Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import {
  INotificationPort,
  NOTIFICATION_PORT,
} from "@pode-deixar/notifications";
import { NotificationsService } from "@pode-deixar/notifications";

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
  private readonly notificationsPort: INotificationPort;

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(NOTIFICATION_PORT)
    notificationsPort?: INotificationPort,
  ) {
    // Explicit UsersNotificationsAdapter via INotificationPort — makes DB seam explicit
    this.notificationsPort =
      notificationsPort ?? new NotificationsService(this.prisma);
  }

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

  // --- Notifications (SERVICE) via explicit UsersNotificationsAdapter ---

  /**
   * Checks for a recent duplicate SERVICE notification via explicit adapter.
   */
  async existsRecent(opts: {
    userId: string;
    type: string;
    title: string;
    contractId?: string | null;
    windowMs?: number;
  }): Promise<boolean> {
    const port = this.notificationsPort as unknown as {
      existsRecent?: (o: {
        userId: string;
        type: string;
        title: string;
        contractId?: string | null;
        windowMs?: number;
      }) => Promise<boolean>;
    };
    if (port.existsRecent) {
      return port.existsRecent(opts);
    }
    return false;
  }

  /**
   * Creates a SERVICE notification via explicit UsersNotificationsAdapter — handles existsRecent + P2002 + rate-limit.
   */
  async notify(dto: {
    userId: string;
    type: string;
    title: string;
    message: string;
    contractId?: string | null;
  }) {
    return this.notificationsPort.notify(
      dto.userId,
      dto.type,
      dto.title,
      dto.message,
      dto.contractId ?? null,
      60000,
    );
  }
}
