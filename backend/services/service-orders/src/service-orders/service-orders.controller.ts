import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ServiceOrdersService } from "./service-orders.service";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";
import { HireProviderServiceDto } from "./dto/hire-provider-service.dto";
import { AgendaQueryDto } from "./dto/agenda-query.dto";
import { PaginationQueryDto } from "../shared/pagination-query.dto";
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";

@ApiTags("Service Orders (Client)")
@Controller("services/me")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get("agenda")
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "List provider paid jobs in the period (calendar agenda)",
    description:
      "Returns only orders with PAID payment and IN_PROGRESS/COMPLETED status where the authenticated provider owns the order or has an ACCEPTED proposal. Max 92-day window.",
  })
  @ApiQuery({
    name: "from",
    required: true,
    description: "Start date (YYYY-MM-DD)",
    example: "2026-08-01",
  })
  @ApiQuery({
    name: "to",
    required: true,
    description: "End date (YYYY-MM-DD)",
    example: "2026-08-31",
  })
  @ApiResponse({
    status: 200,
    description: "Scheduled jobs returned successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid period or window larger than 92 days",
  })
  async agenda(@Request() req: any, @Query() query: AgendaQueryDto) {
    const userId = req.user.sub;
    return this.serviceOrdersService.findProviderAgenda(
      userId,
      query.from,
      query.to,
    );
  }

  @Post()
  @Roles("CLIENT")
  @ApiOperation({ summary: "Create a new service order (clients only)" })
  @ApiResponse({ status: 201, description: "Order created successfully" })
  async create(@Request() req: any, @Body() dto: CreateServiceOrderDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.create(userId, dto, ip);
  }

  @Get()
  @Roles("CLIENT")
  @ApiOperation({ summary: "List my service orders" })
  @ApiResponse({
    status: 200,
    description: "Order list returned successfully",
  })
  async findMyOrders(
    @Request() req: any,
    @Query() pagination: PaginationQueryDto,
  ) {
    const userId = req.user.sub;
    return this.serviceOrdersService.findByClient(userId, pagination);
  }

  @Post("hire")
  @Roles("CLIENT")
  @ApiOperation({
    summary: "Hire a fixed-price service (clients only)",
  })
  @ApiResponse({ status: 201, description: "Service hired successfully" })
  @ApiResponse({
    status: 404,
    description: "Provider service not found",
  })
  @ApiResponse({ status: 400, description: "Service not available" })
  async hire(@Request() req: any, @Body() dto: HireProviderServiceDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.hireFromProvider(userId, dto, ip);
  }
}

@ApiTags("Pedidos de Serviço (Dono)")
@Controller("services/me/:orderId")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MyServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @Roles("CLIENT")
  @ApiOperation({ summary: "Get order detail (owner only)" })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({
    status: 200,
    description: "Order detail returned successfully",
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({
    status: 403,
    description: "Order does not belong to the client",
  })
  async findOne(@Request() req: any, @Param("orderId") orderId: string) {
    const userId = req.user.sub;
    return this.serviceOrdersService.findByIdForClient(orderId, userId);
  }

  @Patch()
  @Roles("CLIENT")
  @ApiOperation({ summary: "Update order (owner only, only if open)" })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({ status: 200, description: "Order updated successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({
    status: 400,
    description: "Order does not belong to the client or is not open",
  })
  async update(
    @Request() req: any,
    @Param("orderId") orderId: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.update(userId, orderId, dto, ip);
  }

  @Delete()
  @Roles("CLIENT")
  @ApiOperation({ summary: "Cancel order (owner only)" })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({ status: 200, description: "Order cancelled successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({
    status: 400,
    description: "Order does not belong to the client",
  })
  async cancel(@Request() req: any, @Param("orderId") orderId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.cancel(userId, orderId, ip);
  }
}

@ApiTags("Pedidos de Serviço (Vitrine do Prestador)")
@Controller("services")
export class PublicServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("PROVIDER")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List open orders (authenticated providers only)",
    description:
      "Excludes orders directed to another provider. The address comes summarized (city/state only).",
  })
  @ApiResponse({
    status: 200,
    description: "Open orders list returned successfully",
  })
  @ApiResponse({ status: 401, description: "Missing or invalid token" })
  @ApiResponse({ status: 403, description: "Restricted to providers" })
  async findOpenOrders(
    @Request() req: any,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.serviceOrdersService.findOpenOrders(req.user.sub, pagination);
  }

  @Get(":orderId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT", "PROVIDER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get order detail (authenticated)" })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({
    status: 200,
    description: "Order detail returned successfully",
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({ status: 403, description: "Access denied to this order" })
  async findOnePublic(@Request() req: any, @Param("orderId") orderId: string) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.serviceOrdersService.findByIdWithAccess(orderId, userId, role);
  }
}

@ApiTags("Pedidos de Serviço (Prestador)")
@Controller("services/requests/received")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProviderReceivedOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "List received orders (directed to the provider)",
  })
  @ApiResponse({
    status: 200,
    description: "Received orders list returned successfully",
  })
  async findReceived(
    @Request() req: any,
    @Query() pagination: PaginationQueryDto,
  ) {
    const userId = req.user.sub;
    return this.serviceOrdersService.findReceivedByProvider(userId, pagination);
  }
}

@ApiTags("Pedidos de Serviço (Prestador)")
@Controller("services/me/:orderId")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProviderOrderActionsController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post("complete")
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Complete order (only the assigned provider)",
    description:
      "Transitions the order from IN_PROGRESS to COMPLETED. Prerequisite for the service review.",
  })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({ status: 200, description: "Order completed successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({
    status: 403,
    description: "Order does not belong to the provider",
  })
  @ApiResponse({
    status: 400,
    description: "Order is not in progress or is already completed",
  })
  async complete(@Request() req: any, @Param("orderId") orderId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.complete(userId, orderId, ip);
  }
}
