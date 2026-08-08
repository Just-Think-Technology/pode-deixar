import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ServicesLoggerService } from "../shared/services-logger.service";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";
import { HireProviderServiceDto } from "./dto/hire-provider-service.dto";

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
      address: order.address,
      status: order.status,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
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

    const order = await this.prisma.serviceOrder.create({
      data: {
        clientId,
        providerId: dto.providerId ?? null,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        budgetMin: dto.budgetMin ?? null,
        budgetMax: dto.budgetMax ?? null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.logServiceOrderCreated(clientId, order.id, ip);

    return this.formatOrder(order);
  }

  async findReceivedByProvider(providerId: string) {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return orders.map((o) => this.formatOrder(o));
  }

  async findByClient(clientId: string) {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
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
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (role === "CLIENT" && order.clientId === userId) {
      return this.formatOrderWithProposals(order);
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
        };
      }

      if (order.providerId === userId) {
        return this.formatOrder(order);
      }
    }

    throw new ForbiddenException("Acesso negado a este pedido");
  }

  async findOpenOrders() {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return orders.map((o) => this.formatOrder(o));
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

    if (existing.status === "CANCELLED") {
      throw new BadRequestException("Pedido já está cancelado");
    }

    if (existing.status === "COMPLETED") {
      throw new BadRequestException(
        "Não é possível cancelar um pedido concluído",
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
}
