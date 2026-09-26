// Service orders service — thin orchestrator for order lifecycle

/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from "@nestjs/common";
import { ServiceOrdersRepository } from "./service-orders.repository";
import { ServicesLoggerService } from "../shared/services-logger.service";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";
import { HireProviderServiceDto } from "./dto/hire-provider-service.dto";
import {
  sanitizeAddress,
  formatAddress,
} from "./dto/service-order-address.dto";
import { normalizePagination, PaginationQuery } from "@pode-deixar/validation";
import { OrderPricing } from "./order-pricing.service";
import { OrderTrackingAssembler } from "./order-tracking-assembler.service";
import { OrderPhotoPipeline } from "./order-photo-pipeline.service";
import {
  toNumber,
  formatOrder,
  formatPhotos,
  formatCompletionHistory,
  formatOpenOrderListItem,
  formatOrderWithProposals,
  formatAgendaItem,
  buildCompletionOrderBase,
} from "./mappers/service-order.mappers";

const MAX_AGENDA_WINDOW_DAYS = 92;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_OBSERVATIONS_LENGTH = 2000;
const MAX_CANCEL_REASON_LENGTH = 500;

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    private repository: ServiceOrdersRepository,
    private servicesLogger: ServicesLoggerService,
    @Optional() private pricing?: OrderPricing,
    @Optional() private trackingAssembler?: OrderTrackingAssembler,
    @Optional() private photoPipeline?: OrderPhotoPipeline,
  ) {}

  private get loggerService(): ServicesLoggerService {
    return this.servicesLogger;
  }

  private resolveToNumber(value: unknown): number | null {
    if (this.pricing) {
      return this.pricing.toNumber(value);
    }
    return toNumber(value);
  }

  private async buildCompletionOrderPayload(order: any) {
    const client = await this.repository.findUserById(order.clientId);
    return buildCompletionOrderBase(order, client);
  }

  private async validateProvider(providerId: string, clientId: string) {
    if (providerId === clientId) {
      throw new BadRequestException(
        "Você não pode solicitar orçamento para si mesmo",
      );
    }

    const provider = await this.repository.findProviderUserById(providerId);

    if (!provider) {
      throw new BadRequestException("Prestador não encontrado");
    }

    if (provider.role !== "PROVIDER") {
      throw new BadRequestException("Usuário não é um prestador");
    }
  }

  async create(clientId: string, dto: CreateServiceOrderDto, ip?: string) {
    if (dto.providerId) {
      await this.validateProvider(dto.providerId, clientId);
    }

    const address = sanitizeAddress(dto.address);

    const order = await this.repository.createOrder({
      clientId,
      providerId: dto.providerId ?? null,
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      budgetMin: dto.budgetMin ?? null,
      budgetMax: dto.budgetMax ?? null,
      ...(address ? { address } : {}),
    });

    this.loggerService.logServiceOrderCreated(clientId, order.id, ip);

    return formatOrder(order);
  }

  async findReceivedByProvider(
    providerId: string,
    pagination?: PaginationQuery,
  ) {
    const { skip, take } = normalizePagination(pagination);
    const orders = await this.repository.findReceivedByProvider(
      providerId,
      skip,
      take,
    );

    return orders.map((o) => formatOrder(o));
  }

  async findByClient(clientId: string, pagination?: PaginationQuery) {
    const { skip, take } = normalizePagination(pagination);
    const orders = await this.repository.findByClient(clientId, skip, take);

    return orders.map((o) => formatOrder(o));
  }

  async findById(id: string) {
    const order = await this.repository.findOrderWithProposalsById(id);

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    return formatOrderWithProposals(order);
  }

  async findByIdForClient(orderId: string, clientId: string) {
    const order = await this.repository.findOrderWithProposalsById(orderId);

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (order.clientId !== clientId) {
      throw new ForbiddenException("Pedido não pertence ao cliente");
    }

    return formatOrderWithProposals(order);
  }

  async findByIdWithAccess(orderId: string, userId: string, role: string) {
    const order = await this.repository.findOrderWithAccessById(orderId);

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (role === "CLIENT" && order.clientId === userId) {
      const payload = await this.buildCompletionOrderPayload(order);
      const withProposals = formatOrderWithProposals(order);
      return {
        ...payload,
        proposals: withProposals.proposals,
        photos: formatPhotos(order.photos),
      };
    }

    if (role === "PROVIDER") {
      if (order.providerId && order.providerId !== userId) {
        throw new ForbiddenException("Acesso negado a este pedido");
      }

      const proposal = order.proposals.find((p) => p.providerId === userId);
      if (proposal) {
        const payload = await this.buildCompletionOrderPayload(order);
        return {
          ...payload,
          proposals: [
            {
              id: proposal.id,
              provider_id: proposal.providerId,
              price: proposal.price,
              description: proposal.description,
              estimated_duration: proposal.estimatedDuration,
              status: proposal.status,
              created_at: proposal.createdAt,
            },
          ],
          photos: formatPhotos(order.photos),
        };
      }

      if (order.providerId === userId) {
        return this.buildCompletionOrderPayload(order);
      }
    }

    throw new ForbiddenException("Acesso negado a este pedido");
  }

  // Open-order showcase for authenticated providers only; excludes orders directed to another provider.
  async findOpenOrders(callerUserId: string, pagination?: PaginationQuery) {
    const { skip, take } = normalizePagination(pagination);
    const orders = await this.repository.findOpenOrders(
      callerUserId,
      skip,
      take,
    );

    return orders.map((o) => formatOpenOrderListItem(o));
  }

  async update(
    clientId: string,
    orderId: string,
    dto: UpdateServiceOrderDto,
    ip?: string,
  ) {
    const existing = await this.repository.findOrderById(orderId);

    if (!existing) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (existing.clientId !== clientId) {
      throw new ForbiddenException("Pedido não pertence a este cliente");
    }

    if (existing.status !== "OPEN") {
      throw new BadRequestException(
        "Só é possível editar pedidos com status aberto",
      );
    }

    const order = await this.repository.updateOrder(orderId, {
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      categoryId: dto.categoryId ?? existing.categoryId,
      budgetMin:
        dto.budgetMin !== undefined ? dto.budgetMin : existing.budgetMin,
      budgetMax:
        dto.budgetMax !== undefined ? dto.budgetMax : existing.budgetMax,
    });

    this.loggerService.logServiceOrderUpdated(clientId, orderId, ip);

    return formatOrder(order);
  }

  async cancel(clientId: string, orderId: string, ip?: string) {
    const existing = await this.repository.findOrderById(orderId);

    if (!existing) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (existing.clientId !== clientId) {
      throw new ForbiddenException("Pedido não pertence a este cliente");
    }

    if (existing.status !== "OPEN") {
      throw new BadRequestException(
        "Só é possível cancelar pedidos com status aberto",
      );
    }

    const order = await this.repository.cancelOrder(orderId);

    this.loggerService.logServiceOrderCancelled(clientId, orderId, ip);

    return formatOrder(order);
  }

  async cancelWithReason(
    userId: string,
    orderId: string,
    reason: string | null,
    role: string,
    ip?: string,
  ) {
    const existing = await this.repository.findOrderById(orderId);

    if (!existing) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (role === "CLIENT" && existing.clientId !== userId) {
      throw new ForbiddenException("Acesso negado a este pedido");
    }

    if (role === "PROVIDER" && existing.providerId !== userId) {
      throw new ForbiddenException("Pedido não pertence a este prestador");
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      throw new BadRequestException("Contratação já finalizada");
    }

    const normalizedReason =
      reason != null && reason.trim().length > 0 ? reason.trim() : null;

    if (
      normalizedReason != null &&
      normalizedReason.length > MAX_CANCEL_REASON_LENGTH
    ) {
      throw new BadRequestException("Motivo deve ter no máximo 500 caracteres");
    }

    const order = await this.repository.cancelWithReason(
      orderId,
      normalizedReason,
    );

    try {
      await this.repository.createTimelineEvent(
        orderId,
        "CANCELLED",
        existing.status,
        "CANCELLED",
        userId,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to record CANCELLED timeline event for order ${orderId}: ${error}`,
      );
    }

    this.loggerService.logServiceOrderCancelled(userId, orderId, ip);

    // Notify counterpart — uses SERVICE type with anti-duplicate existsRecent
    try {
      const counterpartId =
        role === "CLIENT" ? existing.providerId : existing.clientId;
      if (counterpartId) {
        await this.repository.createStatusNotification(
          counterpartId,
          orderId,
          "SERVICE",
          "Contratação cancelada",
          "A contratação foi cancelada",
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to notify cancel for order ${orderId}: ${error}`,
      );
    }

    return formatOrder(order);
  }

  async start(providerId: string, orderId: string) {
    const existing = await this.repository.findOrderById(orderId);

    if (!existing) {
      throw new NotFoundException("Pedido não encontrado");
    }

    if (existing.providerId !== providerId) {
      throw new ForbiddenException("Pedido não pertence a este prestador");
    }

    if (existing.status === "COMPLETED") {
      throw new BadRequestException("Este serviço já foi concluído");
    }

    if (existing.status === "CANCELLED") {
      throw new BadRequestException("Esta contratação foi cancelada");
    }

    if (existing.startedAt) {
      return this.getTracking(orderId, providerId, "PROVIDER");
    }

    if (existing.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        "Só é possível iniciar serviços agendados em andamento",
      );
    }

    // Require PAID payment
    const payments = await this.repository.findPaymentsByOrderId(orderId);
    const hasPaid = payments.some((p: any) => p.status === "PAID");
    if (!hasPaid) {
      throw new BadRequestException(
        "O serviço só pode começar após a confirmação do pagamento",
      );
    }

    await this.repository.startOrder(orderId, providerId);

    try {
      await this.repository.createTimelineEvent(
        orderId,
        "SERVICE_STARTED",
        existing.status,
        "IN_PROGRESS",
        providerId,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to record SERVICE_STARTED timeline event for order ${orderId}: ${error}`,
      );
    }

    this.loggerService.logInfo(
      "service_started",
      `Service ${orderId} started`,
      {
        providerId,
        orderId,
      },
    );

    try {
      const orderForNotify = await this.repository.findOrderById(orderId);
      if (orderForNotify) {
        await this.repository.createStatusNotification(
          orderForNotify.clientId,
          orderId,
          "SERVICE",
          "Serviço iniciado",
          "O prestador iniciou o serviço",
        );
      }
    } catch (_error) {
      void _error;
    }

    return this.getTracking(orderId, providerId, "PROVIDER");
  }

  async finish(
    providerId: string,
    orderId: string,
    files?: Express.Multer.File[] | null,
    observations?: string | null,
    ip?: string,
  ) {
    const existing = await this.repository.findOrderById(orderId);

    if (!existing) {
      throw new NotFoundException("Pedido não encontrado");
    }

    if (existing.providerId !== providerId) {
      throw new ForbiddenException("Pedido não pertence a este prestador");
    }

    if (existing.status === "COMPLETED") {
      return this.getTracking(orderId, providerId, "PROVIDER");
    }

    if (existing.status === "CANCELLED") {
      throw new BadRequestException("Esta contratação foi cancelada");
    }

    if (existing.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        "Só é possível concluir pedidos em andamento",
      );
    }

    if (!existing.startedAt) {
      throw new BadRequestException("Inicie o serviço antes de concluí-lo.");
    }

    const normalizedObservations =
      observations != null && observations.trim().length > 0
        ? observations.trim()
        : null;

    if (
      normalizedObservations != null &&
      normalizedObservations.length > MAX_OBSERVATIONS_LENGTH
    ) {
      throw new BadRequestException(
        "Observações devem ter no máximo 2000 caracteres",
      );
    }

    // Handle multipart photos via deep ImagePipeline (validate + sharp 25M + webp 80 + upload)
    let uploadedCount = 0;
    if (this.photoPipeline) {
      const result = await this.photoPipeline.handleUpload(orderId, files);
      uploadedCount = result.uploadedCount;
    } else if (files && Array.isArray(files) && files.length > 0) {
      throw new BadRequestException("Serviço de fotos indisponível");
    }

    // Enforce at least one photo total (existing + newly uploaded)
    const existingCount = await this.repository.countPhotosByOrderId(orderId);
    if (existingCount + uploadedCount === 0) {
      throw new BadRequestException(
        "Adicione pelo menos uma foto para concluir o serviço.",
      );
    }

    const order = await this.repository.completeOrder(
      orderId,
      providerId,
      normalizedObservations,
    );

    try {
      await this.repository.createTimelineEvent(
        orderId,
        "SERVICE_COMPLETED",
        "IN_PROGRESS",
        "COMPLETED",
        providerId,
      );
      await this.repository.createTimelineEvent(
        orderId,
        "EVIDENCES_ADDED",
        null,
        null,
        providerId,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to record completion timeline events for order ${orderId}: ${error}`,
      );
    }

    this.loggerService.logServiceOrderCompleted(providerId, orderId, ip);

    try {
      await this.repository.createCompletionNotification(
        order.clientId,
        order.id,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to create completion notification for order ${orderId}: ${error}`,
      );
    }

    return this.getTracking(orderId, providerId, "PROVIDER");
  }

  async complete(
    providerId: string,
    orderId: string,
    ip?: string,
    observations?: string | null,
  ) {
    const existing = await this.repository.findOrderById(orderId);

    if (!existing) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (existing.providerId !== providerId) {
      throw new ForbiddenException("Pedido não pertence a este prestador");
    }

    if (existing.status === "COMPLETED") {
      throw new BadRequestException("Pedido já está concluído");
    }

    if (existing.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        "Só é possível concluir pedidos em andamento",
      );
    }

    const normalizedObservations =
      observations != null && observations.trim().length > 0
        ? observations.trim()
        : null;

    if (
      normalizedObservations != null &&
      normalizedObservations.length > MAX_OBSERVATIONS_LENGTH
    ) {
      throw new BadRequestException(
        "Observações devem ter no máximo 2000 caracteres",
      );
    }

    const photoCount = await this.repository.countPhotosByOrderId(orderId);
    if (photoCount === 0) {
      throw new BadRequestException(
        "Adicione pelo menos uma foto para concluir o serviço.",
      );
    }

    const order = await this.repository.completeOrder(
      orderId,
      providerId,
      normalizedObservations,
    );

    this.loggerService.logServiceOrderCompleted(providerId, orderId, ip);

    // Notify the client — failure must not roll back the completion
    try {
      await this.repository.createCompletionNotification(
        order.clientId,
        order.id,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to create completion notification for order ${orderId}: ${error}`,
      );
    }

    const photos = await this.repository.findPhotosByOrderId(orderId);
    return formatCompletionHistory(order, photos);
  }

  async getCompletionHistory(orderId: string, userId: string, role: string) {
    const order = await this.repository.findOrderWithAccessById(orderId);

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    // Access mirrors findByIdWithAccess
    let hasAccess = false;
    if (role === "CLIENT" && order.clientId === userId) {
      hasAccess = true;
    } else if (role === "PROVIDER") {
      if (order.providerId === userId) {
        hasAccess = true;
      } else if (order.proposals.some((p) => p.providerId === userId)) {
        hasAccess = true;
      }
      if (order.providerId && order.providerId !== userId && !hasAccess) {
        throw new ForbiddenException("Acesso negado a este pedido");
      }
    }

    if (!hasAccess) {
      throw new ForbiddenException("Acesso negado a este pedido");
    }

    if (order.status !== "COMPLETED") {
      throw new NotFoundException("Histórico de conclusão não encontrado");
    }

    const photos = await this.repository.findPhotosByOrderId(orderId);
    return formatCompletionHistory(order, photos);
  }

  async hireFromProvider(
    clientId: string,
    dto: HireProviderServiceDto,
    ip?: string,
  ) {
    const providerService = await this.repository.findProviderServiceById(
      dto.providerServiceId,
    );

    if (!providerService) {
      throw new NotFoundException("Serviço do prestador não encontrado");
    }

    if (!providerService.isActive) {
      throw new BadRequestException("Serviço não está disponível");
    }

    const providerUserId = providerService.providerProfile.userId;

    if (providerUserId === clientId) {
      throw new BadRequestException(
        "Você não pode contratar seu próprio serviço",
      );
    }

    const address = sanitizeAddress(dto.address);

    const order = await this.repository.createHiredOrder({
      clientId,
      providerId: providerUserId,
      providerServiceId: providerService.id,
      agreedPrice: providerService.fixedPrice,
      title: providerService.title,
      description: providerService.description,
      categoryId: providerService.categoryId,
      ...(address ? { address } : {}),
    });

    this.loggerService.logInfo(
      "service_order_hired",
      `Service hired by client ${clientId}`,
      {
        clientId,
        orderId: order.id,
        providerServiceId: providerService.id,
        agreedPrice: providerService.fixedPrice,
        ip,
      },
    );

    return formatOrder(order);
  }

  async findProviderAgenda(providerId: string, from: string, to: string) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Período informado é inválido");
    }

    if (fromDate > toDate) {
      throw new BadRequestException("from deve ser anterior ou igual a to");
    }

    const days = Math.ceil(
      (toDate.getTime() - fromDate.getTime()) / MS_PER_DAY,
    );

    if (days > MAX_AGENDA_WINDOW_DAYS) {
      throw new BadRequestException(
        `A janela máxima de consulta é de ${MAX_AGENDA_WINDOW_DAYS} days`,
      );
    }

    const orders = await this.repository.findProviderAgenda(
      providerId,
      fromDate,
      toDate,
    );

    return orders.map((o) => formatAgendaItem(o));
  }

  async getTracking(
    orderId: string,
    userId: string,
    role: string,
  ): Promise<any> {
    const order = await this.repository.findOrderTrackingById(orderId);

    if (!order) {
      throw new NotFoundException("Pedido não encontrado");
    }

    // Ownership check per docs/decisions/ownership-access.md
    if (role === "CLIENT" && (order as any).clientId !== userId) {
      throw new ForbiddenException("Acesso negado");
    }

    if (role === "PROVIDER") {
      const proposals = (order as any).proposals ?? [];
      const isOwner = (order as any).providerId === userId;
      const hasProposal = proposals.some((p: any) => p.providerId === userId);
      const isDirectedToOther =
        (order as any).providerId != null &&
        (order as any).providerId !== userId;

      // If directed to another provider and caller has no proposal → 403
      if (isDirectedToOther && !hasProposal) {
        throw new ForbiddenException("Acesso negado");
      }

      if (!isOwner && !hasProposal) {
        throw new ForbiddenException("Acesso negado");
      }
    }

    if (this.trackingAssembler) {
      return this.trackingAssembler.assemble(order, userId, role);
    }

    // Fallback when assembler not injected — keep legacy pure path for old tests
    return this.toContractTrackingFallback(order, userId, role);
  }

  private async toContractTrackingFallback(
    order: any,
    _viewerId: string,
    role: string,
  ) {
    const rawGross =
      order.agreedPrice ??
      order.proposals?.find((p: any) => p.status === "ACCEPTED")?.price ??
      null;
    const gross = this.resolveToNumber(rawGross);

    const feeRate = Number(process.env.PLATFORM_FEE_RATE ?? "0.10");
    const feeAmount =
      gross != null ? Math.round(gross * feeRate * 100) / 100 : null;
    const netAmount =
      gross != null && feeAmount != null
        ? Math.round((gross - feeAmount) * 100) / 100
        : null;

    const counterpartId = role === "CLIENT" ? order.providerId : order.clientId;
    let counterpartUser: any = null;
    if (counterpartId) {
      counterpartUser = await this.repository.findUserById(counterpartId);
    }

    const counterpart = {
      id: counterpartUser?.id ?? counterpartId ?? "",
      completeName:
        counterpartUser?.completeName ??
        (role === "CLIENT" ? "Prestador" : "Cliente"),
      avatarUrl:
        counterpartUser?.avatarUrl ??
        counterpartUser?.clientProfile?.avatarUrl ??
        counterpartUser?.providerProfile?.avatarUrl ??
        null,
    };

    const accepted = order.proposals?.find((p: any) => p.status === "ACCEPTED");
    const reference = accepted ?? order.proposals?.[0] ?? null;
    let proposal: any = null;
    if (reference) {
      const isAccepted = reference.status === "ACCEPTED";
      proposal = {
        id: reference.id,
        providerId: reference.providerId,
        price: this.resolveToNumber(reference.price) ?? 0,
        description: reference.description,
        estimatedDuration: reference.estimatedDuration ?? null,
        acceptedAt: isAccepted
          ? reference.createdAt
            ? new Date(reference.createdAt).toISOString()
            : null
          : null,
      };
    }

    const paymentRecord = order.payments?.[0] ?? null;
    const payment = paymentRecord
      ? {
          id: paymentRecord.id,
          status: paymentRecord.status,
          method: paymentRecord.method ?? null,
          amount: this.resolveToNumber(paymentRecord.amount),
          paidAt: paymentRecord.paidAt
            ? new Date(paymentRecord.paidAt).toISOString()
            : null,
        }
      : {
          id: null,
          status: "PENDING",
          method: null,
          amount: null,
          paidAt: null,
        };

    const reviewRecord = order.reviews?.[0] ?? null;
    const review = reviewRecord
      ? {
          id: reviewRecord.id,
          rating: reviewRecord.rating,
          comment: reviewRecord.comment ?? null,
          createdAt: reviewRecord.createdAt
            ? new Date(reviewRecord.createdAt).toISOString()
            : new Date().toISOString(),
        }
      : null;

    let evidence: any = null;
    if (order.status === "COMPLETED" && order.completedAt) {
      evidence = {
        completedAt: new Date(order.completedAt).toISOString(),
        completedBy: order.completedBy ?? counterpart.completeName,
        observations: order.observations ?? null,
        photos: (order.photos ?? []).map((p: any) => ({
          id: p.id,
          url: `/api/services/photos/${p.id}/view`,
        })),
      };
    }

    const address =
      formatAddress(order.address) ??
      ({
        street: null,
        number: null,
        neighborhood: null,
        city: null,
        state: null,
        postal_code: null,
      } as any);

    const base: any = {
      orderId: order.id,
      title: order.title,
      description: order.description,
      categoryName: order.category?.name ?? null,
      orderStatus: order.status,
      role,
      counterpart,
      scheduledAt: order.scheduledAt
        ? new Date(order.scheduledAt).toISOString()
        : null,
      scheduledEndAt: order.scheduledEndAt
        ? new Date(order.scheduledEndAt).toISOString()
        : null,
      startedAt: order.startedAt
        ? new Date(order.startedAt).toISOString()
        : null,
      address,
      grossAmount: gross,
      proposal,
      payment,
      evidence,
      review,
      cancelReason: order.cancelReason ?? null,
      cancelledAt: order.cancelledAt
        ? new Date(order.cancelledAt).toISOString()
        : null,
      createdAt: order.createdAt
        ? new Date(order.createdAt).toISOString()
        : null,
    };

    if (role === "CLIENT") {
      base.feeAmount = undefined;
      base.netAmount = undefined;
    } else {
      base.feeAmount = feeAmount;
      base.netAmount = netAmount;
    }

    return base;
  }
}
