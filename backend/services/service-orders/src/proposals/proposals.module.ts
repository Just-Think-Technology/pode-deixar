import { Module } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import {
  ProposalsController,
  MyProposalsController,
  ProposalDetailController,
  AcceptRejectController,
} from "./proposals.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [
    ProposalsController,
    MyProposalsController,
    ProposalDetailController,
    AcceptRejectController,
  ],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
