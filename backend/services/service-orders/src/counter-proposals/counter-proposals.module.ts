// Counter proposals module — proposal negotiation wiring

import { Module } from "@nestjs/common";
import { CounterProposalsService } from "./counter-proposals.service";
import {
  CounterProposalsController,
  CounterProposalActionController,
} from "./counter-proposals.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({

  // --- Imports ---

  imports: [PrismaModule, SharedModule],

  // --- Controllers ---

  controllers: [CounterProposalsController, CounterProposalActionController],

  // --- Providers ---

  providers: [CounterProposalsService],
})
export class CounterProposalsModule {}
