import { Module } from "@nestjs/common";
import { CounterProposalsService } from "./counter-proposals.service";
import { CounterProposalsRepository } from "./counter-proposals.repository";
import {
  CounterProposalsController,
  CounterProposalActionController,
} from "./counter-proposals.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [CounterProposalsController, CounterProposalActionController],
  providers: [CounterProposalsService, CounterProposalsRepository],
})
export class CounterProposalsModule {}
