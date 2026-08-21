import { Module } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import {
  ReviewsController,
  PublicReviewsController,
} from "./reviews.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [ReviewsController, PublicReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
