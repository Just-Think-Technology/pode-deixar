import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ServicesLoggerService } from "../shared/services-logger.service";
import { CreateCounterProposalDto } from "./dto/create-counter-proposal.dto";

@Injectable()
export class CounterProposalsService {
  constructor(
    private prisma: PrismaService,
    private logger: ServicesLoggerService,
  ) {}

  private formatCounterProposal(cp: any) {
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

  async create(senderId: string, dto: CreateCounterProposalDto, ip?: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: dto.proposalId },
      include: { serviceOrder: true },
    });

    if (!proposal) {
      throw new NotFoundException("Proposta não encontrada");
    }

    if (proposal.status !== "PENDING") {
      throw new BadRequestException(
        "Só é possível contrapor propostas pendentes",
      );
    }

    const isClient = proposal.serviceOrder.clientId === senderId;
    const isProvider = proposal.providerId === senderId;

    if (!isClient && !isProvider) {
      throw new ForbiddenException(
        "Você não tem permissão para contrapor esta proposta",
      );
    }

    const existingPending = await this.prisma.counterProposal.findFirst({
      where: {
        proposalId: dto.proposalId,
        senderId,
        status: "PENDING",
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        "Você já possui uma contraproposta pendente para esta proposta",
      );
    }

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

  async accept(userId: string, counterProposalId: string, ip?: string) {
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
        "Você não pode aceitar sua própria contraproposta",
      );
    }

    const isClient = cp.proposal.serviceOrder.clientId === userId;
    const isProvider = cp.proposal.providerId === userId;

    if (!isClient && !isProvider) {
      throw new ForbiddenException(
        "Você não tem permissão para aceitar esta contraproposta",
      );
    }

    if (cp.proposal.serviceOrder.status !== "OPEN") {
      throw new BadRequestException("O pedido não está mais aberto");
    }

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

    this.logger.logInfo(
      "counter_proposal_accepted",
      `Counter-proposal ${counterProposalId} accepted`,
      { counterProposalId, proposalId: cp.proposalId, userId, ip },
    );

    return this.formatCounterProposal(updatedCp);
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

    const isClient = cp.proposal.serviceOrder.clientId === userId;
    const isProvider = cp.proposal.providerId === userId;

    if (!isClient && !isProvider) {
      throw new ForbiddenException(
        "Você não tem permissão para rejeitar esta contraproposta",
      );
    }

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

  async findByProposal(userId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { serviceOrder: true },
    });

    if (!proposal) {
      throw new NotFoundException("Proposta não encontrada");
    }

    const isClient = proposal.serviceOrder.clientId === userId;
    const isProvider = proposal.providerId === userId;

    if (!isClient && !isProvider) {
      throw new ForbiddenException(
        "Você não tem permissão para ver as contrapropostas desta proposta",
      );
    }

    const counterProposals = await this.prisma.counterProposal.findMany({
      where: { proposalId },
      orderBy: { createdAt: "desc" },
    });

    return counterProposals.map((cp) => this.formatCounterProposal(cp));
  }

  async findMySent(senderId: string) {
    const counterProposals = await this.prisma.counterProposal.findMany({
      where: { senderId },
      orderBy: { createdAt: "desc" },
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
