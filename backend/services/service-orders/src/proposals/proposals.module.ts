// Proposals module — provider proposal wiring

import { Module } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import {
  ProposalsController,
  ProposalDetailController,
  AcceptRejectController,
} from "./proposals.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

@Module({

  // --- Imports ---

  imports: [PrismaModule, SharedModule],

  // --- Controllers ---

  controllers: [
    ProposalsController,
    ProposalDetailController,
    AcceptRejectController,
  ],

  // --- Providers ---

  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
