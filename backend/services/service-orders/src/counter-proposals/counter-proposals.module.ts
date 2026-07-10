import { Module } from "@nestjs/common";
import { CounterProposalsService } from "./counter-proposals.service";
import {
  CounterProposalsController,
  CounterProposalActionController,
} from "./counter-proposals.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [CounterProposalsController, CounterProposalActionController],
  providers: [CounterProposalsService],
})
export class CounterProposalsModule {}
