// Counter proposals module — proposal negotiation wiring

import { Module } from "@nestjs/common";
import { CounterProposalsService } from "./counter-proposals.service";
import {
  CounterProposalsController,
  CounterProposalActionController,
} from "./counter-proposals.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

import { CounterProposalsRepository } from "./counter-proposals.repository";

@Module({
  // --- Imports ---

  imports: [PrismaModule, SharedModule],

  // --- Controllers ---

  controllers: [CounterProposalsController, CounterProposalActionController],

  // --- Providers ---

  providers: [CounterProposalsService, CounterProposalsRepository],
})
export class CounterProposalsModule {}
