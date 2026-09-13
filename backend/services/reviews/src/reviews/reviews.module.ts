// Reviews module — order review wiring

import { Module } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import {
  ReviewsController,
  PublicReviewsController,
} from "./reviews.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({

  // --- Imports ---

  imports: [PrismaModule, SharedModule],

  // --- Controllers ---

  controllers: [ReviewsController, PublicReviewsController],

  // --- Providers ---

  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
