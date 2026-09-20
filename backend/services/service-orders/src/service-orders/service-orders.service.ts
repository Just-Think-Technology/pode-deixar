// Service orders service — order lifecycle, proposals and photos
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
  formatAddressSummary,
} from "./dto/service-order-address.dto";
import {
  normalizePagination,
  PaginationQuery,
  validateImageFile,
} from "@pode-deixar/validation";
import { MinioService } from "@pode-deixar/storage";
import { PhotosRepository } from "../photos/photos.repository";
import sharp from "sharp";

const MAX_AGENDA_WINDOW_DAYS = 92;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_OBSERVATIONS_LENGTH = 2000;
const MAX_CANCEL_REASON_LENGTH = 500;
const SHARP_PIXEL_LIMIT = 25_000_000;

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    private repository: ServiceOrdersRepository,
    private servicesLogger: ServicesLoggerService,
    @Optional() private photosRepository?: PhotosRepository,
    @Optional() private minio?: MinioService,
  ) {}

  private get loggerService(): ServicesLoggerService {
    return this.servicesLogger;
  }

  private toNumber(value: unknown): number | null {
    if (value == null) {
      return null;
    }
    if (typeof value === "number") {
      return value;
    }
    // Prisma Decimal
    const decimal = value as { toNumber?: () => number };
    if (typeof decimal.toNumber === "function") {
      return decimal.toNumber();
    }
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  private formatOrder(order: any) {
    return {
      id: order.id,
      client_id: order.clientId,
      provider_id: order.providerId ?? null,
      provider_service_id: order.providerServiceId ?? null,
      agreed_price: order.agreedPrice ?? null,
      title: order.title,
      description: order.description,
      category_id: order.categoryId,
      category: order.category
        ? {
            id: order.category.id,
            name: order.category.name,
            slug: order.category.slug,
          }
        : null,
      budget_min: order.budgetMin,
      budget_max: order.budgetMax,
      address: formatAddress(order.address),
      status: order.status,
      scheduled_at: order.scheduledAt ?? null,
      scheduled_end_at: order.scheduledEndAt ?? null,
      completed_at: order.completedAt ?? null,
      completed_by: order.completedBy ?? null,
      observations: order.observations ?? null,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    };
  }

  // Exposed `url` is the authenticated view endpoint since the bucket is not public.
  private formatPhotos(photos: any[] | undefined) {
    return (photos ?? []).map((p: any) => ({
      id: p.id,
      url: `/api/services/photos/${p.id}/view`,
      created_at: p.createdAt ?? undefined,
    }));
  }

  private formatCompletionHistory(order: any, photos: any[]) {
    return {
      order_id: order.id,
      completed_at: order.completedAt ? order.completedAt.toISOString() : null,
      completed_by: order.completedBy ?? null,
      observations: order.observations ?? null,
      photos: photos.map((p: any) => ({
        id: p.id,
        url: `/api/services/photos/${p.id}/view`,
      })),
    };
  }

  private async buildCompletionOrderPayload(order: any) {
    const client = await this.repository.findUserById(order.clientId);
    const amount = this.toNumber(order.agreedPrice);
    return {
      ...this.formatOrder(order),
      // Aliases expected by the completion screen (CompletionOrder)
      order_id: order.id,
      client_name: client?.completeName ?? "Cliente",
      scheduled_at: order.scheduledAt ? order.scheduledAt.toISOString() : null,
      scheduled_end_at: order.scheduledEndAt
        ? order.scheduledEndAt.toISOString()
        : null,
      amount: amount ?? 0,
      order_status: order.status,
      photos: this.formatPhotos(order.photos),
    };
  }

  // Showcase items use a brief address to avoid exposing street/number/ZIP.
  private formatOpenOrderListItem(order: any) {
    return {
      ...this.formatOrder(order),
      address: formatAddressSummary(order.address),
    };
  }

  private formatOrderWithProposals(order: any) {
    return {
      ...this.formatOrder(order),
      proposals: order.proposals.map((p: any) => ({
        id: p.id,
        provider_id: p.providerId,
        price: p.price,
        description: p.description,
        estimated_duration: p.estimatedDuration,
        status: p.status,
        created_at: p.createdAt,
      })),
    };
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

    return this.formatOrder(order);
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

    return orders.map((o) => this.formatOrder(o));
  }

  async findByClient(clientId: string, pagination?: PaginationQuery) {
    const { skip, take } = normalizePagination(pagination);
    const orders = await this.repository.findByClient(clientId, skip, take);

    return orders.map((o) => this.formatOrder(o));
  }

  async findById(id: string) {
    const order = await this.repository.findOrderWithProposalsById(id);

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    return this.formatOrderWithProposals(order);
  }

  async findByIdForClient(orderId: string, clientId: string) {
    const order = await this.repository.findOrderWithProposalsById(orderId);

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (order.clientId !== clientId) {
      throw new ForbiddenException("Pedido não pertence ao cliente");
    }

    return this.formatOrderWithProposals(order);
  }

  async findByIdWithAccess(orderId: string, userId: string, role: string) {
    const order = await this.repository.findOrderWithAccessById(orderId);

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (role === "CLIENT" && order.clientId === userId) {
      const payload = await this.buildCompletionOrderPayload(order);
      const withProposals = this.formatOrderWithProposals(order);
      return {
        ...payload,
        proposals: withProposals.proposals,
        photos: this.formatPhotos(order.photos),
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
          photos: this.formatPhotos(order.photos),
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

    return orders.map((o) => this.formatOpenOrderListItem(o));
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

    return this.formatOrder(order);
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

    return this.formatOrder(order);
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
    } catch (_error) {
      void _error;
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

    return this.formatOrder(order);
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
    } catch (_error) {
      void _error;
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

    // Handle multipart photos if provided
    let uploadedCount = 0;
    if (files && Array.isArray(files) && files.length > 0) {
      if (files.length > 10) {
        throw new BadRequestException("Máximo de 10 fotos por upload");
      }

      for (const file of files) {
        validateImageFile(file.originalname, file.buffer);
      }

      const webpBuffers: Buffer[] = [];
      for (const file of files) {
        try {
          const webpBuffer = await sharp(file.buffer, {
            limitInputPixels: SHARP_PIXEL_LIMIT,
          })
            .webp({ quality: 80 })
            .toBuffer();
          webpBuffers.push(webpBuffer);
        } catch {
          throw new BadRequestException(
            `Imagem inválida ou corrompida: "${file.originalname}"`,
          );
        }
      }

      if (!this.photosRepository || !this.minio) {
        throw new BadRequestException("Serviço de fotos indisponível");
      }

      await this.photosRepository.uploadPhotos(
        orderId,
        webpBuffers,
        (fileName, buffer, mimeType) =>
          this.minio!.uploadFile(fileName, buffer, mimeType),
      );
      uploadedCount = files.length;
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
    } catch (_error) {
      void _error;
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
    return this.formatCompletionHistory(order, photos);
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
    return this.formatCompletionHistory(order, photos);
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

    return this.formatOrder(order);
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

    return orders.map((o) => this.formatAgendaItem(o));
  }

  private formatAgendaItem(order: any) {
    const payment = order.payments?.[0] ?? null;

    return {
      id: order.id,
      order_id: order.id,
      title: order.title,
      description: order.description,
      scheduled_at: order.scheduledAt,
      scheduled_end_at: order.scheduledEndAt ?? null,
      order_status: order.status,
      address: formatAddress(order.address),
      photos: this.formatPhotos(order.photos),
      payment: payment
        ? {
            status: payment.status,
            amount: payment.amount,
            paid_at: payment.paidAt,
          }
        : null,
    };
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

    return this.toContractTracking(order, userId, role);
  }

  private async toContractTracking(
    order: any,
    _viewerId: string,
    role: string,
  ) {
    // Gross amount from agreedPrice or accepted proposal price
    const rawGross =
      order.agreedPrice ??
      order.proposals?.find((p: any) => p.status === "ACCEPTED")?.price ??
      null;
    const gross = this.toNumber(rawGross);

    const feeRate = Number(process.env.PLATFORM_FEE_RATE ?? "0.10");
    const feeAmount =
      gross != null ? Math.round(gross * feeRate * 100) / 100 : null;
    const netAmount =
      gross != null && feeAmount != null
        ? Math.round((gross - feeAmount) * 100) / 100
        : null;

    // Counterpart lookup
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

    // Proposal: accepted or first
    const accepted = order.proposals?.find((p: any) => p.status === "ACCEPTED");
    const reference = accepted ?? order.proposals?.[0] ?? null;
    let proposal: any = null;
    if (reference) {
      const isAccepted = reference.status === "ACCEPTED";
      proposal = {
        id: reference.id,
        providerId: reference.providerId,
        price: this.toNumber(reference.price) ?? 0,
        description: reference.description,
        estimatedDuration: reference.estimatedDuration ?? null,
        acceptedAt: isAccepted
          ? reference.createdAt
            ? new Date(reference.createdAt).toISOString()
            : null
          : null,
      };
    }

    // Payment: latest (first in array, orderBy createdAt desc)
    const paymentRecord = order.payments?.[0] ?? null;
    const payment = paymentRecord
      ? {
          id: paymentRecord.id,
          status: paymentRecord.status,
          method: paymentRecord.method ?? null,
          amount: this.toNumber(paymentRecord.amount),
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

    // Review: first
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

    // Evidence: only when COMPLETED
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
    } else {
      evidence = null;
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

    // Fee redaction for CLIENT (AppSec): omit feeAmount/netAmount
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
