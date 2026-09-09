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
} from "@nestjs/swagger";
import { ProposalsService } from "./proposals.service";
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { UpdateProposalDto } from "./dto/update-proposal.dto";
import { PaginationQueryDto } from "../shared/pagination-query.dto";
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
    summary: "Create a proposal for an order (providers only)",
  })
  @ApiResponse({ status: 201, description: "Proposal created successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({
    status: 400,
    description: "Order is not open or already has a proposal",
  })
  async create(@Request() req: any, @Body() dto: CreateProposalDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.proposalsService.create(userId, dto, ip);
  }

  @Get("me")
  @Roles("PROVIDER")
  @ApiOperation({ summary: "List my proposals (providers only)" })
  @ApiResponse({
    status: 200,
    description: "Proposals list returned successfully",
  })
  async findMyProposals(
    @Request() req: any,
    @Query() pagination: PaginationQueryDto,
  ) {
    const userId = req.user.sub;
    return this.proposalsService.findByProvider(userId, pagination);
  }
}

@ApiTags("Propostas (Detalhe do Prestador)")
@Controller("proposals/:proposalId")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProposalDetailController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Get proposal detail (owner only)" })
  @ApiParam({ name: "proposalId", description: "Proposal ID" })
  @ApiResponse({
    status: 200,
    description: "Proposal detail returned successfully",
  })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  async findOne(@Request() req: any, @Param("proposalId") proposalId: string) {
    const userId = req.user.sub;
    return this.proposalsService.findByIdForProvider(proposalId, userId);
  }

  @Patch()
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Update proposal (owner only, only if pending)",
  })
  @ApiParam({ name: "proposalId", description: "Proposal ID" })
  @ApiResponse({ status: 200, description: "Proposal updated successfully" })
  @ApiResponse({ status: 404, description: "Proposal not found" })
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
  @ApiOperation({ summary: "Withdraw proposal (owner only, only if pending)" })
  @ApiParam({ name: "proposalId", description: "Proposal ID" })
  @ApiResponse({ status: 200, description: "Proposal withdrawn successfully" })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  async withdraw(@Request() req: any, @Param("proposalId") proposalId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.proposalsService.withdraw(userId, proposalId, ip);
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
  @ApiOperation({ summary: "Accept proposal (order owner only)" })
  @ApiParam({ name: "proposalId", description: "Proposal ID" })
  @ApiResponse({ status: 200, description: "Proposal accepted successfully" })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  @ApiResponse({
    status: 400,
    description: "Order is not open or proposal is not pending",
  })
  async accept(@Request() req: any, @Param("proposalId") proposalId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.proposalsService.accept(userId, proposalId, ip);
  }

  @Post("reject")
  @Roles("CLIENT")
  @ApiOperation({ summary: "Reject proposal (order owner only)" })
  @ApiParam({ name: "proposalId", description: "Proposal ID" })
  @ApiResponse({ status: 200, description: "Proposal rejected successfully" })
  @ApiResponse({ status: 404, description: "Proposal not found" })
  async reject(@Request() req: any, @Param("proposalId") proposalId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.proposalsService.reject(userId, proposalId, ip);
  }
}
