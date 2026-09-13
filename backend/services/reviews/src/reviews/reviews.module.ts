import { Module } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { ReviewsRepository } from "./reviews.repository";
import {
  ReviewsController,
  PublicReviewsController,
} from "./reviews.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [ReviewsController, PublicReviewsController],
  providers: [ReviewsService, ReviewsRepository],
  exports: [ReviewsService],
})
export class ReviewsModule {}
