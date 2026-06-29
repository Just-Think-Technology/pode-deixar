import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ServicesLoggerService } from "../shared/services-logger.service";
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { UpdateProposalDto } from "./dto/update-proposal.dto";

@Injectable()
export class ProposalsService {
  constructor(
    private prisma: PrismaService,
    private logger: ServicesLoggerService,
  ) {}

  private formatProposal(proposal: any) {
    return {
      id: proposal.id,
      service_order_id: proposal.serviceOrderId,
      provider_id: proposal.providerId,
      price: proposal.price,
      description: proposal.description,
      estimated_duration: proposal.estimatedDuration,
      status: proposal.status,
      created_at: proposal.createdAt,
      updated_at: proposal.updatedAt,
    };
  }

  async create(providerId: string, dto: CreateProposalDto, ip?: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: dto.serviceOrderId },
    });

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (order.status !== "OPEN") {
      throw new BadRequestException(
        "Só é possível fazer proposta para pedidos abertos",
      );
    }

    if (order.clientId === providerId) {
      throw new BadRequestException(
        "Você não pode fazer proposta para o seu próprio pedido",
      );
    }

    const existing = await this.prisma.proposal.findFirst({
      where: {
        serviceOrderId: dto.serviceOrderId,
        providerId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        "Você já possui uma proposta ativa para este pedido",
      );
    }

    const proposal = await this.prisma.proposal.create({
      data: {
        serviceOrderId: dto.serviceOrderId,
        providerId,
        price: dto.price,
        description: dto.description,
        estimatedDuration: dto.estimatedDuration ?? null,
      },
    });

    this.logger.logProposalCreated(providerId, proposal.id, ip);

    return this.formatProposal(proposal);
  }

  async findByProvider(providerId: string) {
    const proposals = await this.prisma.proposal.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
    });

    return proposals.map((p) => this.formatProposal(p));
  }

  async findByServiceOrder(serviceOrderId: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
    });

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    const proposals = await this.prisma.proposal.findMany({
      where: { serviceOrderId },
      orderBy: { price: "asc" },
    });

    return proposals.map((p) => this.formatProposal(p));
  }

  async update(
    providerId: string,
    proposalId: string,
    dto: UpdateProposalDto,
    ip?: string,
  ) {
    const existing = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!existing) {
      throw new NotFoundException("Proposta não encontrada");
    }

    if (existing.providerId !== providerId) {
      throw new BadRequestException("Proposta não pertence a este prestador");
    }

    if (existing.status !== "PENDING") {
      throw new BadRequestException("Só é possível editar propostas pendentes");
    }

    const proposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        price: dto.price ?? existing.price,
        description: dto.description ?? existing.description,
        estimatedDuration:
          dto.estimatedDuration !== undefined
            ? dto.estimatedDuration
            : existing.estimatedDuration,
      },
    });

    this.logger.logProposalUpdated(providerId, proposalId, ip);

    return this.formatProposal(proposal);
  }

  async withdraw(providerId: string, proposalId: string, ip?: string) {
    const existing = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!existing) {
      throw new NotFoundException("Proposta não encontrada");
    }

    if (existing.providerId !== providerId) {
      throw new BadRequestException("Proposta não pertence a este prestador");
    }

    if (existing.status !== "PENDING") {
      throw new BadRequestException(
        "Só é possível retirar propostas pendentes",
      );
    }

    const proposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "WITHDRAWN" },
    });

    this.logger.logProposalWithdrawn(providerId, proposalId, ip);

    return this.formatProposal(proposal);
  }

  async accept(clientId: string, proposalId: string, ip?: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { serviceOrder: true },
    });

    if (!proposal) {
      throw new NotFoundException("Proposta não encontrada");
    }

    if (proposal.serviceOrder.clientId !== clientId) {
      throw new BadRequestException("O pedido não pertence a este cliente");
    }

    if (proposal.serviceOrder.status !== "OPEN") {
      throw new BadRequestException("O pedido não está mais aberto");
    }

    if (proposal.status !== "PENDING") {
      throw new BadRequestException("Proposta não está mais pendente");
    }

    const [updatedProposal] = await this.prisma.$transaction([
      this.prisma.proposal.update({
        where: { id: proposalId },
        data: { status: "ACCEPTED" },
      }),
      this.prisma.proposal.updateMany({
        where: {
          serviceOrderId: proposal.serviceOrderId,
          id: { not: proposalId },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      }),
      this.prisma.serviceOrder.update({
        where: { id: proposal.serviceOrderId },
        data: { status: "IN_PROGRESS" },
      }),
    ]);

    this.logger.logProposalAccepted(proposal.serviceOrderId, proposalId, ip);

    return this.formatProposal(updatedProposal);
  }

  async reject(clientId: string, proposalId: string, ip?: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { serviceOrder: true },
    });

    if (!proposal) {
      throw new NotFoundException("Proposta não encontrada");
    }

    if (proposal.serviceOrder.clientId !== clientId) {
      throw new BadRequestException("O pedido não pertence a este cliente");
    }

    if (proposal.status !== "PENDING") {
      throw new BadRequestException("Proposta não está mais pendente");
    }

    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "REJECTED" },
    });

    this.logger.logInfo(
      "proposal_rejected",
      `Proposal ${proposalId} rejected`,
      {
        clientId,
        proposalId,
        ip,
      },
    );

    return this.formatProposal(updated);
  }
}
