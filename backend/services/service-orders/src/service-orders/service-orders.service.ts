import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
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
} from "../shared/pagination-query.dto";

const MAX_AGENDA_WINDOW_DAYS = 92;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ServiceOrdersService {
  constructor(
    private prisma: PrismaService,
    private logger: ServicesLoggerService,
  ) {}

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
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    };
  }

  // Exposed `url` is the authenticated view endpoint since the bucket is not public.
  private formatPhotos(photos: any[] | undefined) {
    return (photos ?? []).map((p: any) => ({
      id: p.id,
      url: `/api/services/photos/${p.id}/view`,
    }));
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

    const provider = await this.prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true, role: true },
    });

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

    const order = await this.prisma.serviceOrder.create({
      data: {
        clientId,
        providerId: dto.providerId ?? null,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        budgetMin: dto.budgetMin ?? null,
        budgetMax: dto.budgetMax ?? null,
        ...(address ? { address: address } : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.logServiceOrderCreated(clientId, order.id, ip);

    return this.formatOrder(order);
  }

  async findReceivedByProvider(
    providerId: string,
    pagination?: PaginationQuery,
  ) {
    const { skip, take } = normalizePagination(pagination);
    const orders = await this.prisma.serviceOrder.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return orders.map((o) => this.formatOrder(o));
  }

  async findByClient(clientId: string, pagination?: PaginationQuery) {
    const { skip, take } = normalizePagination(pagination);
    const orders = await this.prisma.serviceOrder.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return orders.map((o) => this.formatOrder(o));
  }

  async findById(id: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        proposals: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    return this.formatOrderWithProposals(order);
  }

  async findByIdForClient(orderId: string, clientId: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: {
        proposals: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (order.clientId !== clientId) {
      throw new ForbiddenException("Pedido não pertence ao cliente");
    }

    return this.formatOrderWithProposals(order);
  }

  async findByIdWithAccess(orderId: string, userId: string, role: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: {
        proposals: true,
        photos: {
          select: { id: true, url: true },
          orderBy: { createdAt: "asc" },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (role === "CLIENT" && order.clientId === userId) {
      return {
        ...this.formatOrderWithProposals(order),
        photos: this.formatPhotos(order.photos),
      };
    }

    if (role === "PROVIDER") {
      if (order.providerId && order.providerId !== userId) {
        throw new ForbiddenException("Acesso negado a este pedido");
      }

      const proposal = order.proposals.find((p) => p.providerId === userId);
      if (proposal) {
        return {
          ...this.formatOrder(order),
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
        return {
          ...this.formatOrder(order),
          photos: this.formatPhotos(order.photos),
        };
      }
    }

    throw new ForbiddenException("Acesso negado a este pedido");
  }

  // Open-order showcase for authenticated providers only; excludes orders directed to another provider.
  async findOpenOrders(callerUserId: string, pagination?: PaginationQuery) {
    const { skip, take } = normalizePagination(pagination);
    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        status: "OPEN",
        OR: [{ providerId: null }, { providerId: callerUserId }],
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return orders.map((o) => this.formatOpenOrderListItem(o));
  }

  async update(
    clientId: string,
    orderId: string,
    dto: UpdateServiceOrderDto,
    ip?: string,
  ) {
    const existing = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });

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

    const order = await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        categoryId: dto.categoryId ?? existing.categoryId,
        budgetMin:
          dto.budgetMin !== undefined ? dto.budgetMin : existing.budgetMin,
        budgetMax:
          dto.budgetMax !== undefined ? dto.budgetMax : existing.budgetMax,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.logServiceOrderUpdated(clientId, orderId, ip);

    return this.formatOrder(order);
  }

  async cancel(clientId: string, orderId: string, ip?: string) {
    const existing = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });

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

    const order = await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.logServiceOrderCancelled(clientId, orderId, ip);

    return this.formatOrder(order);
  }

  async complete(providerId: string, orderId: string, ip?: string) {
    const existing = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });

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

    const order = await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: "COMPLETED" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.logServiceOrderCompleted(providerId, orderId, ip);

    return this.formatOrder(order);
  }

  async hireFromProvider(
    clientId: string,
    dto: HireProviderServiceDto,
    ip?: string,
  ) {
    const providerService = await this.prisma.providerService.findUnique({
      where: { id: dto.providerServiceId },
      include: {
        providerProfile: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });

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

    const order = await this.prisma.serviceOrder.create({
      data: {
        clientId,
        providerId: providerUserId,
        providerServiceId: providerService.id,
        agreedPrice: providerService.fixedPrice,
        title: providerService.title,
        description: providerService.description,
        categoryId: providerService.categoryId,
        status: "IN_PROGRESS",
        ...(address ? { address: address } : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.logInfo(
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

    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "COMPLETED"] },
        scheduledAt: { gte: fromDate, lte: toDate },
        payments: { some: { status: "PAID" } },
        OR: [
          { providerId },
          {
            proposals: { some: { providerId, status: "ACCEPTED" } },
          },
        ],
      },
      include: {
        photos: {
          select: { id: true, url: true },
          orderBy: { createdAt: "asc" },
        },
        payments: {
          where: { status: "PAID" },
          orderBy: { paidAt: "desc" },
          take: 1,
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

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
}
