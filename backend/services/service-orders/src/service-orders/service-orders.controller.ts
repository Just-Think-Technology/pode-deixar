import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ServiceOrdersService } from "./service-orders.service";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Pedidos de Serviço (Cliente)")
@Controller("services/me")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @Roles("CLIENT")
  @ApiOperation({ summary: "Criar novo pedido de serviço (apenas clientes)" })
  @ApiResponse({ status: 201, description: "Pedido criado com sucesso" })
  async create(@Request() req: any, @Body() dto: CreateServiceOrderDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.create(userId, dto, ip);
  }

  @Get()
  @Roles("CLIENT")
  @ApiOperation({ summary: "Listar meus pedidos de serviço" })
  @ApiResponse({
    status: 200,
    description: "Lista de pedidos retornada com sucesso",
  })
  async findMyOrders(@Request() req: any) {
    const userId = req.user.sub;
    return this.serviceOrdersService.findByClient(userId);
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
  @ApiOperation({ summary: "Obter detalhe de um pedido (apenas dono)" })
  @ApiParam({ name: "orderId", description: "ID do pedido" })
  @ApiResponse({
    status: 200,
    description: "Detalhe do pedido retornado com sucesso",
  })
  @ApiResponse({ status: 404, description: "Pedido não encontrado" })
  async findOne(@Param("orderId") orderId: string) {
    return this.serviceOrdersService.findById(orderId);
  }

  @Patch()
  @Roles("CLIENT")
  @ApiOperation({ summary: "Atualizar pedido (apenas dono, apenas se aberto)" })
  @ApiParam({ name: "orderId", description: "ID do pedido" })
  @ApiResponse({ status: 200, description: "Pedido atualizado com sucesso" })
  @ApiResponse({ status: 404, description: "Pedido não encontrado" })
  @ApiResponse({
    status: 400,
    description: "Pedido não pertence ao cliente ou não está aberto",
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
  @ApiOperation({ summary: "Cancelar pedido (apenas dono)" })
  @ApiParam({ name: "orderId", description: "ID do pedido" })
  @ApiResponse({ status: 200, description: "Pedido cancelado com sucesso" })
  @ApiResponse({ status: 404, description: "Pedido não encontrado" })
  @ApiResponse({ status: 400, description: "Pedido não pertence ao cliente" })
  async cancel(@Request() req: any, @Param("orderId") orderId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.cancel(userId, orderId, ip);
  }
}

@ApiTags("Pedidos de Serviço (Público)")
@Controller("services")
export class PublicServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @ApiOperation({ summary: "Listar pedidos abertos (para prestadores)" })
  @ApiResponse({
    status: 200,
    description: "Lista de pedidos abertos retornada com sucesso",
  })
  async findOpenOrders() {
    return this.serviceOrdersService.findOpenOrders();
  }

  @Get(":orderId")
  @ApiOperation({ summary: "Obter detalhe de um pedido (público)" })
  @ApiParam({ name: "orderId", description: "ID do pedido" })
  @ApiResponse({
    status: 200,
    description: "Detalhe do pedido retornado com sucesso",
  })
  @ApiResponse({ status: 404, description: "Pedido não encontrado" })
  async findOnePublic(@Param("orderId") orderId: string) {
    return this.serviceOrdersService.findById(orderId);
  }
}

@ApiTags("Pedidos de Serviço (Detalhe)")
@Controller("services/:orderId")
export class ServiceOrderDetailController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @ApiOperation({ summary: "Obter detalhe de um pedido" })
  @ApiParam({ name: "orderId", description: "ID do pedido" })
  @ApiResponse({
    status: 200,
    description: "Detalhe do pedido retornado com sucesso",
  })
  @ApiResponse({ status: 404, description: "Pedido não encontrado" })
  async findOne(@Param("orderId") orderId: string) {
    return this.serviceOrdersService.findById(orderId);
  }
}
