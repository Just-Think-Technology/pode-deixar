// Reviews module — order review wiring

import { Module } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import {
  ReviewsController,
  PublicReviewsController,
} from "./reviews.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

import { ReviewsRepository } from "./reviews.repository";

@Module({
  // --- Imports ---

  imports: [PrismaModule, SharedModule],

  // --- Controllers ---

  controllers: [ReviewsController, PublicReviewsController],

  // --- Providers ---

  providers: [ReviewsService, ReviewsRepository],
  exports: [ReviewsService],
})
export class ReviewsModule {}
