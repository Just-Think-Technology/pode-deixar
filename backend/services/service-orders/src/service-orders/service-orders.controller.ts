// Service orders controller — order lifecycle endpoints
/* eslint-disable @typescript-eslint/no-unsafe-return */

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
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { ServiceOrdersService } from "./service-orders.service";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";
import { CompleteServiceOrderDto } from "./dto/complete-service-order.dto";
import { CancelServiceOrderDto } from "./dto/cancel-service-order.dto";
import { HireProviderServiceDto } from "./dto/hire-provider-service.dto";
import { AgendaQueryDto } from "./dto/agenda-query.dto";
import { PaginationQueryDto } from "@pode-deixar/validation";
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
  async findOne(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
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
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.update(userId, orderId, dto, ip);
  }

  @Delete()
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({
    summary:
      "Cancel order (owner client or assigned provider, any non-final status)",
    description:
      "Cancels the hiring from any non-final status (OPEN, IN_PROGRESS, etc.) with optional cancelReason and cancelledAt. Final states COMPLETED/CANCELLED are rejected.",
  })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiBody({ type: CancelServiceOrderDto, required: false })
  @ApiResponse({ status: 200, description: "Order cancelled successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({
    status: 400,
    description: "Order does not belong to the client or already finalized",
  })
  @ApiResponse({ status: 403, description: "Access denied" })
  async cancel(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto?: CancelServiceOrderDto,
  ) {
    const userId = req.user.sub;
    const role = req.user.role;
    const ip = req.ip;
    const reason = dto?.cancelReason ?? dto?.reason ?? null;

    // Backward compat: legacy DELETE without body for CLIENT OPEN still works via cancelWithReason
    return this.serviceOrdersService.cancelWithReason(
      userId,
      orderId,
      reason,
      role,
      ip,
    );
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
  async findOnePublic(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
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
      "Transitions the order from IN_PROGRESS to COMPLETED. Requires at least one evidence photo and optional observations (max 2000 chars). Prerequisite for the service review.",
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
    description:
      "Order is not in progress, is already completed, or has no evidence photos",
  })
  async complete(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: CompleteServiceOrderDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.complete(
      userId,
      orderId,
      ip,
      dto.observations ?? null,
    );
  }

  @Post("start")
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Start service (provider, SCHEDULED → IN_PROGRESS)",
    description:
      "Records startedAt for the assigned provider. Requires PAID payment and IN_PROGRESS status without prior startedAt.",
  })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({ status: 200, description: "Service started successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({
    status: 403,
    description: "Order does not belong to the provider",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid transition (already started, payment not PAID, etc.)",
  })
  async start(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
    const userId = req.user.sub;
    return this.serviceOrdersService.start(userId, orderId);
  }

  @Post("finish")
  @Roles("PROVIDER")
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    }),
  )
  @ApiOperation({
    summary: "Finish service with evidence (provider, IN_PROGRESS → COMPLETED)",
    description:
      "Multipart finish: photos[] (1-10×5MB, validated + webp) + observations field. Also accepts JSON { photoCount, observations } for backward compat (photoCount checked via existing evidence). Enforces started before finish and ≥1 photo total.",
  })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        photos: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
        file: { type: "string", format: "binary" },
        observations: { type: "string" },
        photoCount: { type: "number" },
      },
    },
  })
  async finish(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;

    // Support both multipart (files + observations field) and JSON { observations, photoCount }
    const observations =
      typeof body?.observations === "string" ? body.observations : null;

    // If JSON photoCount is sent without files, we still delegate to service which checks existing photo count
    const effectiveFiles =
      Array.isArray(files) && files.length > 0 ? files : null;

    // When JSON photoCount is provided without files, we let the service validate via DB count
    // (spec: 400 if 0 photos). No extra handling needed.

    return this.serviceOrdersService.finish(
      userId,
      orderId,
      effectiveFiles,
      observations,
      ip,
    );
  }

  @Get("completion")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({
    summary: "Get completion history (owner client or assigned provider)",
    description:
      "Returns completed_at, completed_by, observations and evidence photos when the order is COMPLETED. Reuses findByIdWithAccess visibility rules.",
  })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({
    status: 200,
    description: "Completion history returned successfully",
  })
  @ApiResponse({ status: 404, description: "Order or history not found" })
  @ApiResponse({ status: 403, description: "Access denied to this order" })
  async getCompletion(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.serviceOrdersService.getCompletionHistory(
      orderId,
      userId,
      role,
    );
  }
}

@ApiTags("Tracking")
@Controller("services/:orderId/tracking")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TrackingController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  @ApiOperation({
    summary: "Get consolidated tracking (client/provider)",
    description:
      "Returns ContractTracking per frontend/lib/tracking/types.ts — order, counterpart, proposal, payment, evidence, review, cancel, address, fees (feeAmount/netAmount only for PROVIDER). Enforces ownership per docs/decisions/ownership-access.md.",
  })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({ status: 200, description: "Tracking returned successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({ status: 403, description: "Access denied" })
  async getTracking(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.serviceOrdersService.getTracking(orderId, userId, role);
  }
}
