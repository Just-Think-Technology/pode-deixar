import {
  Controller,
  Get,
  Post,
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
} from "@nestjs/swagger";
import { CounterProposalsService } from "./counter-proposals.service";
import { CreateCounterProposalDto } from "./dto/create-counter-proposal.dto";
import { PaginationQueryDto } from "../shared/pagination-query.dto";
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";

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
  @ApiOperation({ summary: "Create counter-proposal (client or provider)" })
  @ApiResponse({
    status: 201,
    description: "Counter-proposal created successfully",
  })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  @ApiResponse({
    status: 400,
    description:
      "Proposal is not pending or already has an active counter-proposal",
  })
  async create(@Request() req: any, @Body() dto: CreateCounterProposalDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.counterProposalsService.create(userId, dto, ip);
  }

  @Get("me")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "List my sent counter-proposals" })
  @ApiResponse({
    status: 200,
    description: "Counter-proposals list returned successfully",
  })
  async findMySent(
    @Request() req: any,
    @Query() pagination: PaginationQueryDto,
  ) {
    const userId = req.user.sub;
    return this.counterProposalsService.findMySent(userId, pagination);
  }

  @Get("proposal/:proposalId")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "List counter-proposals of a proposal" })
  @ApiParam({ name: "proposalId", description: "ID da proposta" })
  @ApiResponse({
    status: 200,
    description: "Counter-proposals list returned successfully",
  })
  async findByProposal(
    @Request() req: any,
    @Param("proposalId") proposalId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const userId = req.user.sub;
    return this.counterProposalsService.findByProposal(
      userId,
      proposalId,
      pagination,
    );
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
  @ApiOperation({ summary: "Accept counter-proposal" })
  @ApiParam({ name: "counterProposalId", description: "ID da contraproposta" })
  @ApiResponse({
    status: 200,
    description: "Counter-proposal accepted successfully",
  })
  @ApiResponse({ status: 404, description: "Counter-proposal not found" })
  @ApiResponse({
    status: 400,
    description: "Counter-proposal is not pending or order is not open",
  })
  async accept(
    @Request() req: any,
    @Param("counterProposalId") counterProposalId: string,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.counterProposalsService.accept(userId, counterProposalId, ip);
  }

  @Post("reject")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Reject counter-proposal" })
  @ApiParam({ name: "counterProposalId", description: "ID da contraproposta" })
  @ApiResponse({
    status: 200,
    description: "Counter-proposal rejected successfully",
  })
  @ApiResponse({ status: 404, description: "Counter-proposal not found" })
  async reject(
    @Request() req: any,
    @Param("counterProposalId") counterProposalId: string,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.counterProposalsService.reject(userId, counterProposalId, ip);
  }
}
