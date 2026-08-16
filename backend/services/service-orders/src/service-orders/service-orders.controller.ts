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

  @Post("hire")
  @Roles("CLIENT")
  @ApiOperation({
    summary: "Contratar serviço com valor fixo (apenas clientes)",
  })
  @ApiResponse({ status: 201, description: "Serviço contratado com sucesso" })
  @ApiResponse({
    status: 404,
    description: "Serviço do prestador não encontrado",
  })
  @ApiResponse({ status: 400, description: "Serviço não disponível" })
  async hire(@Request() req: any, @Body() dto: HireProviderServiceDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceOrdersService.hireFromProvider(userId, dto, ip);
  }
}

@ApiTags("Pedidos de Serviço (Agenda do Prestador)")
@Controller("services/me/agenda")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProviderAgendaController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @Roles("PROVIDER")
  @ApiOperation({
    summary:
      "Listar serviços pagos do prestador no período (agenda do calendário)",
    description:
      "Retorna apenas pedidos com pagamento PAID e status IN_PROGRESS/COMPLETED, onde o prestador autenticado é o prestador do pedido ou tem proposta ACCEPTED. Janela máxima de 92 dias.",
  })
  @ApiQuery({
    name: "from",
    required: true,
    description: "Data inicial (YYYY-MM-DD)",
    example: "2026-08-01",
  })
  @ApiQuery({
    name: "to",
    required: true,
    description: "Data final (YYYY-MM-DD)",
    example: "2026-08-31",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de serviços agendados retornada com sucesso",
  })
  @ApiResponse({
    status: 400,
    description: "Período inválido ou janela maior que 92 dias",
  })
  async agenda(@Request() req: any, @Query() query: AgendaQueryDto) {
    const userId = req.user.sub;
    return this.serviceOrdersService.findProviderAgenda(
      userId,
      query.from,
      query.to,
    );
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
  @ApiResponse({ status: 403, description: "Pedido não pertence ao cliente" })
  async findOne(@Request() req: any, @Param("orderId") orderId: string) {
    const userId = req.user.sub;
    return this.serviceOrdersService.findByIdForClient(orderId, userId);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT", "PROVIDER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obter detalhe de um pedido (autenticado)" })
  @ApiParam({ name: "orderId", description: "ID do pedido" })
  @ApiResponse({
    status: 200,
    description: "Detalhe do pedido retornado com sucesso",
  })
  @ApiResponse({ status: 404, description: "Pedido não encontrado" })
  @ApiResponse({ status: 403, description: "Acesso negado a este pedido" })
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
    summary: "Listar pedidos recebidos (direcionados ao prestador)",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de pedidos recebidos retornada com sucesso",
  })
  async findReceived(@Request() req: any) {
    const userId = req.user.sub;
    return this.serviceOrdersService.findReceivedByProvider(userId);
  }
}
