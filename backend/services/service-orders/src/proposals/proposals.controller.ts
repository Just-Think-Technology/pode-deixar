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
import { ProposalsService } from "./proposals.service";
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { UpdateProposalDto } from "./dto/update-proposal.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Propostas (Prestador)")
@Controller("proposals")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post()
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Criar proposta para um pedido (apenas prestadores)",
  })
  @ApiResponse({ status: 201, description: "Proposta criada com sucesso" })
  @ApiResponse({ status: 404, description: "Pedido não encontrado" })
  @ApiResponse({
    status: 400,
    description: "Pedido não está aberto ou já possui proposta",
  })
  async create(@Request() req: any, @Body() dto: CreateProposalDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.proposalsService.create(userId, dto, ip);
  }

  @Get("me")
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Listar minhas propostas (apenas prestadores)" })
  @ApiResponse({
    status: 200,
    description: "Lista de propostas retornada com sucesso",
  })
  async findMyProposals(@Request() req: any) {
    const userId = req.user.sub;
    return this.proposalsService.findByProvider(userId);
  }
}

@ApiTags("Propostas (Detalhe do Prestador)")
@Controller("proposals/:proposalId")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProposalDetailController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Patch()
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Atualizar proposta (apenas dono, apenas pendente)",
  })
  @ApiParam({ name: "proposalId", description: "ID da proposta" })
  @ApiResponse({ status: 200, description: "Proposta atualizada com sucesso" })
  @ApiResponse({ status: 404, description: "Proposta não encontrada" })
  async update(
    @Request() req: any,
    @Param("proposalId") proposalId: string,
    @Body() dto: UpdateProposalDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.proposalsService.update(userId, proposalId, dto, ip);
  }

  @Delete()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Retirar proposta (apenas dono, apenas pendente)" })
  @ApiParam({ name: "proposalId", description: "ID da proposta" })
  @ApiResponse({ status: 200, description: "Proposta retirada com sucesso" })
  @ApiResponse({ status: 404, description: "Proposta não encontrada" })
  async withdraw(@Request() req: any, @Param("proposalId") proposalId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.proposalsService.withdraw(userId, proposalId, ip);
  }
}

@ApiTags("Propostas do Prestador (Listagem)")
@Controller("proposals/me")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MyProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Listar minhas propostas" })
  @ApiResponse({
    status: 200,
    description: "Lista de propostas retornada com sucesso",
  })
  async findMyProposals(@Request() req: any) {
    const userId = req.user.sub;
    return this.proposalsService.findByProvider(userId);
  }
}

@ApiTags("Propostas (Aceitar/Rejeitar)")
@Controller("proposals/:proposalId")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AcceptRejectController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post("accept")
  @Roles("CLIENT")
  @ApiOperation({ summary: "Aceitar proposta (apenas dono do pedido)" })
  @ApiParam({ name: "proposalId", description: "ID da proposta" })
  @ApiResponse({ status: 200, description: "Proposta aceita com sucesso" })
  @ApiResponse({ status: 404, description: "Proposta não encontrada" })
  @ApiResponse({
    status: 400,
    description: "Pedido não está aberto ou proposta não está pendente",
  })
  async accept(@Request() req: any, @Param("proposalId") proposalId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.proposalsService.accept(userId, proposalId, ip);
  }

  @Post("reject")
  @Roles("CLIENT")
  @ApiOperation({ summary: "Rejeitar proposta (apenas dono do pedido)" })
  @ApiParam({ name: "proposalId", description: "ID da proposta" })
  @ApiResponse({ status: 200, description: "Proposta rejeitada com sucesso" })
  @ApiResponse({ status: 404, description: "Proposta não encontrada" })
  async reject(@Request() req: any, @Param("proposalId") proposalId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.proposalsService.reject(userId, proposalId, ip);
  }
}
