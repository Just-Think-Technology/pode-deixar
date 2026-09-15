// Counter proposals service — proposal price negotiation

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { ServicesLoggerService } from "../shared/services-logger.service";
import { CreateCounterProposalDto } from "./dto/create-counter-proposal.dto";
import {
  normalizePagination,
  PaginationQuery,
} from "../shared/pagination-query.dto";
import { CounterProposal, Prisma } from "@prisma/client";

type ProposalWithOrder = Prisma.ProposalGetPayload<{
  include: { serviceOrder: true };
}>;

type CounterProposalWithNegotiation = Prisma.CounterProposalGetPayload<{
  include: { proposal: { include: { serviceOrder: true } } };
}>;

@Injectable()
export class CounterProposalsService {
  constructor(
    private prisma: PrismaService,
    private logger: ServicesLoggerService,
  ) {}

  // --- Private Helpers ---

  private formatCounterProposal(cp: CounterProposal) {
    return {
      id: cp.id,
      proposal_id: cp.proposalId,
      sender_id: cp.senderId,
      price: cp.price,
      description: cp.description,
      estimated_duration: cp.estimatedDuration,
      status: cp.status,
      created_at: cp.createdAt,
      updated_at: cp.updatedAt,
    };
  }

  // --- Public API ---

  /**
   * Creates a counter-proposal on a pending proposal.
   * Only the order client or the proposal provider may counter, and each
   * side holds at most one pending counter-proposal at a time.
   */
  async create(senderId: string, dto: CreateCounterProposalDto, ip?: string) {
    const proposal = await this.findProposalOrThrow(dto.proposalId);
    this.assertCounterable(proposal, senderId);
    await this.assertNoPendingCounterProposal(dto.proposalId, senderId);

    const counterProposal = await this.prisma.counterProposal.create({
      data: {
        proposalId: dto.proposalId,
        senderId,
        price: dto.price,
        description: dto.description,
        estimatedDuration: dto.estimatedDuration ?? null,
      },
    });

    this.logger.logInfo(
      "counter_proposal_created",
      `Counter-proposal created by ${senderId} for proposal ${dto.proposalId}`,
      {
        senderId,
        proposalId: dto.proposalId,
        counterProposalId: counterProposal.id,
        ip,
      },
    );

    return this.formatCounterProposal(counterProposal);
  }

  /**
   * Accepts a counter-proposal, closing the negotiation in favor of it.
   * Accepting one proposal rejects the competing pending proposals and
   * moves the order to IN_PROGRESS with the counter-proposal price.
   */
  async accept(userId: string, counterProposalId: string, ip?: string) {
    const cp = await this.findCounterProposalOrThrow(counterProposalId);
    this.assertAcceptable(cp, userId);
    const updatedCp = await this.applyAcceptance(cp, counterProposalId);

    this.logger.logInfo(
      "counter_proposal_accepted",
      `Counter-proposal ${counterProposalId} accepted`,
      { counterProposalId, proposalId: cp.proposalId, userId, ip },
    );

    return this.formatCounterProposal(updatedCp);
  }

  private async findProposalOrThrow(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { serviceOrder: true },
    });
    if (!proposal) {
      throw new NotFoundException("Proposta não encontrada");
    }
    return proposal;
  }

  private assertCounterable(
    proposal: ProposalWithOrder,
    senderId: string,
  ): void {
    if (proposal.status !== "PENDING") {
      throw new BadRequestException(
        "Só é possível contrapor propostas pendentes",
      );
    }
    this.assertNegotiationParticipant(
      proposal.serviceOrder.clientId,
      proposal.providerId,
      senderId,
      "Você não tem permissão para contrapor esta proposta",
    );
  }

  private async assertNoPendingCounterProposal(
    proposalId: string,
    senderId: string,
  ): Promise<void> {
    const existingPending = await this.prisma.counterProposal.findFirst({
      where: { proposalId, senderId, status: "PENDING" },
    });
    if (existingPending) {
      throw new BadRequestException(
        "Você já possui uma contraproposta pendente para esta proposta",
      );
    }
  }

  private async findCounterProposalOrThrow(counterProposalId: string) {
    const cp = await this.prisma.counterProposal.findUnique({
      where: { id: counterProposalId },
      include: { proposal: { include: { serviceOrder: true } } },
    });
    if (!cp) {
      throw new NotFoundException("Contraproposta não encontrada");
    }
    return cp;
  }

  private assertAcceptable(
    cp: CounterProposalWithNegotiation,
    userId: string,
  ): void {
    if (cp.status !== "PENDING") {
      throw new BadRequestException("Contraproposta não está mais pendente");
    }
    if (cp.senderId === userId) {
      throw new BadRequestException(
        "Você não pode aceitar sua própria contraproposta",
      );
    }
    this.assertNegotiationParticipant(
      cp.proposal.serviceOrder.clientId,
      cp.proposal.providerId,
      userId,
      "Você não tem permissão para aceitar esta contraproposta",
    );
    if (cp.proposal.serviceOrder.status !== "OPEN") {
      throw new BadRequestException("O pedido não está mais aberto");
    }
  }

  private async applyAcceptance(
    cp: CounterProposalWithNegotiation,
    counterProposalId: string,
  ) {
    const [updatedCp] = await this.prisma.$transaction([
      this.prisma.counterProposal.update({
        where: { id: counterProposalId },
        data: { status: "ACCEPTED" },
      }),
      this.prisma.proposal.update({
        where: { id: cp.proposalId },
        data: { status: "ACCEPTED" },
      }),
      this.prisma.proposal.updateMany({
        where: {
          serviceOrderId: cp.proposal.serviceOrderId,
          id: { not: cp.proposalId },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      }),
      this.prisma.counterProposal.updateMany({
        where: {
          proposalId: cp.proposalId,
          id: { not: counterProposalId },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      }),
      this.prisma.serviceOrder.update({
        where: { id: cp.proposal.serviceOrderId },
        data: {
          status: "IN_PROGRESS",
          providerId: cp.proposal.providerId,
          agreedPrice: cp.price,
        },
      }),
    ]);
    return updatedCp;
  }

  private assertNegotiationParticipant(
    clientId: string,
    providerId: string,
    userId: string,
    forbiddenMessage: string,
  ): void {
    const isClient = clientId === userId;
    const isProvider = providerId === userId;
    if (!isClient && !isProvider) {
      throw new ForbiddenException(forbiddenMessage);
    }
  }

  async reject(userId: string, counterProposalId: string, ip?: string) {
    const cp = await this.prisma.counterProposal.findUnique({
      where: { id: counterProposalId },
      include: {
        proposal: {
          include: { serviceOrder: true },
        },
      },
    });

    if (!cp) {
      throw new NotFoundException("Contraproposta não encontrada");
    }

    if (cp.status !== "PENDING") {
      throw new BadRequestException("Contraproposta não está mais pendente");
    }

    if (cp.senderId === userId) {
      throw new BadRequestException(
        "Você não pode rejeitar sua própria contraproposta",
      );
    }

    this.assertNegotiationParticipant(
      cp.proposal.serviceOrder.clientId,
      cp.proposal.providerId,
      userId,
      "Você não tem permissão para rejeitar esta contraproposta",
    );

    const updated = await this.prisma.counterProposal.update({
      where: { id: counterProposalId },
      data: { status: "REJECTED" },
    });

    this.logger.logInfo(
      "counter_proposal_rejected",
      `Counter-proposal ${counterProposalId} rejected`,
      { counterProposalId, proposalId: cp.proposalId, userId, ip },
    );

    return this.formatCounterProposal(updated);
  }

  async findByProposal(
    userId: string,
    proposalId: string,
    pagination?: PaginationQuery,
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { serviceOrder: true },
    });

    if (!proposal) {
      throw new NotFoundException("Proposta não encontrada");
    }

    this.assertNegotiationParticipant(
      proposal.serviceOrder.clientId,
      proposal.providerId,
      userId,
      "Você não tem permissão para ver as contrapropostas desta proposta",
    );

    const { skip, take } = normalizePagination(pagination);
    const counterProposals = await this.prisma.counterProposal.findMany({
      where: { proposalId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    return counterProposals.map((cp) => this.formatCounterProposal(cp));
  }

  async findMySent(senderId: string, pagination?: PaginationQuery) {
    const { skip, take } = normalizePagination(pagination);
    const counterProposals = await this.prisma.counterProposal.findMany({
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

    return counterProposals.map((cp) => ({
      ...this.formatCounterProposal(cp),
      proposal: cp.proposal
        ? {
            id: cp.proposal.id,
            service_order_id: cp.proposal.serviceOrderId,
            price: cp.proposal.price,
            status: cp.proposal.status,
          }
        : null,
    }));
  }
}
