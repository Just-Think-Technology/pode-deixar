import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { CounterProposalsRepository } from "./counter-proposals.repository";
import { ServicesLoggerService } from "../shared/services-logger.service";
import { CreateCounterProposalDto } from "./dto/create-counter-proposal.dto";
import { normalizePagination, PaginationQuery } from "@pode-deixar/validation";

@Injectable()
export class CounterProposalsService {
  constructor(
    private repository: CounterProposalsRepository,
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
    const proposal = await this.repository.findProposalWithOrder(
      dto.proposalId,
    );

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

    const existingPending =
      await this.repository.findPendingByProposalAndSender(
        dto.proposalId,
        senderId,
      );

    if (existingPending) {
      throw new BadRequestException(
        "Você já possui uma contraproposta pendente para esta proposta",
      );
    }

    const counterProposal = await this.repository.createCounterProposal({
      proposalId: dto.proposalId,
      senderId,
      price: dto.price,
      description: dto.description,
      estimatedDuration: dto.estimatedDuration ?? null,
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
    const cp =
      await this.repository.findCounterProposalWithRelations(counterProposalId);

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

    const [updatedCp] = await this.repository.acceptCounterProposal(
      counterProposalId,
      cp.proposalId,
      cp.proposal.serviceOrderId,
      cp.proposal.providerId,
      cp.price,
    );

    this.logger.logInfo(
      "counter_proposal_accepted",
      `Counter-proposal ${counterProposalId} accepted`,
      { counterProposalId, proposalId: cp.proposalId, userId, ip },
    );

    return this.formatCounterProposal(updatedCp);
  }

  async reject(userId: string, counterProposalId: string, ip?: string) {
    const cp =
      await this.repository.findCounterProposalWithRelations(counterProposalId);

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

    const updated = await this.repository.updateCounterProposalStatus(
      counterProposalId,
      "REJECTED",
    );

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
    const proposal = await this.repository.findProposalWithOrder(proposalId);

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

    const { skip, take } = normalizePagination(pagination);
    const counterProposals =
      await this.repository.findCounterProposalsByProposal(
        proposalId,
        skip,
        take,
      );

    return counterProposals.map((cp) => this.formatCounterProposal(cp));
  }

  async findMySent(senderId: string, pagination?: PaginationQuery) {
    const { skip, take } = normalizePagination(pagination);
    const counterProposals = await this.repository.findSentBySender(
      senderId,
      skip,
      take,
    );

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
