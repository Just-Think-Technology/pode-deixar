import {
  Controller,
  Get,
  Post,
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
import { CounterProposalsService } from "./counter-proposals.service";
import { CreateCounterProposalDto } from "./dto/create-counter-proposal.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Contrapropostas")
@Controller("counter-proposals")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CounterProposalsController {
  constructor(
    private readonly counterProposalsService: CounterProposalsService,
  ) {}

  @Post()
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Criar contraproposta (cliente ou prestador)" })
  @ApiResponse({ status: 201, description: "Contraproposta criada com sucesso" })
  @ApiResponse({ status: 404, description: "Proposta não encontrada" })
  @ApiResponse({
    status: 400,
    description: "Proposta não está pendente ou já possui contraproposta ativa",
  })
  async create(@Request() req: any, @Body() dto: CreateCounterProposalDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.counterProposalsService.create(userId, dto, ip);
  }

  @Get("me")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Listar minhas contrapropostas enviadas" })
  @ApiResponse({
    status: 200,
    description: "Lista de contrapropostas retornada com sucesso",
  })
  async findMySent(@Request() req: any) {
    const userId = req.user.sub;
    return this.counterProposalsService.findMySent(userId);
  }

  @Get("proposal/:proposalId")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Listar contrapropostas de uma proposta" })
  @ApiParam({ name: "proposalId", description: "ID da proposta" })
  @ApiResponse({
    status: 200,
    description: "Lista de contrapropostas retornada com sucesso",
  })
  async findByProposal(@Param("proposalId") proposalId: string) {
    return this.counterProposalsService.findByProposal(proposalId);
  }
}

@ApiTags("Contrapropostas (Aceitar/Rejeitar)")
@Controller("counter-proposals/:counterProposalId")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CounterProposalActionController {
  constructor(
    private readonly counterProposalsService: CounterProposalsService,
  ) {}

  @Post("accept")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Aceitar contraproposta" })
  @ApiParam({ name: "counterProposalId", description: "ID da contraproposta" })
  @ApiResponse({ status: 200, description: "Contraproposta aceita com sucesso" })
  @ApiResponse({ status: 404, description: "Contraproposta não encontrada" })
  @ApiResponse({
    status: 400,
    description: "Contraproposta não está pendente ou pedido não está aberto",
  })
  async accept(@Request() req: any, @Param("counterProposalId") counterProposalId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.counterProposalsService.accept(userId, counterProposalId, ip);
  }

  @Post("reject")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Rejeitar contraproposta" })
  @ApiParam({ name: "counterProposalId", description: "ID da contraproposta" })
  @ApiResponse({ status: 200, description: "Contraproposta rejeitada com sucesso" })
  @ApiResponse({ status: 404, description: "Contraproposta não encontrada" })
  async reject(@Request() req: any, @Param("counterProposalId") counterProposalId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.counterProposalsService.reject(userId, counterProposalId, ip);
  }
}
