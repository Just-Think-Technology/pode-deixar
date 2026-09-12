import { Module } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import { ProposalsRepository } from "./proposals.repository";
import {
  ProposalsController,
  ProposalDetailController,
  AcceptRejectController,
} from "./proposals.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [
    ProposalsController,
    ProposalDetailController,
    AcceptRejectController,
  ],
  providers: [ProposalsService, ProposalsRepository],
  exports: [ProposalsService],
})
export class ProposalsModule {}
