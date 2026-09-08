import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Reviews")
@Controller("reviews")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Create a review for a completed and paid order" })
  @ApiResponse({ status: 201, description: "Review created successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({
    status: 400,
    description:
      "Order not completed/paid, no provider assigned, or already reviewed",
  })
  @ApiResponse({
    status: 403,
    description: "User is not a party to the order",
  })
  async create(@Request() req: any, @Body() dto: CreateReviewDto) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.reviewsService.create(userId, dto, ip);
  }

  @Get("me")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "List reviews I wrote" })
  @ApiResponse({
    status: 200,
    description: "Review list returned successfully",
  })
  async findMine(@Request() req: any): Promise<
    {
      id: string;
      service_order_id: string;
      reviewer_id: string;
      reviewee_id: string;
      rating: number;
      comment: string | null;
      created_at: Date;
      updated_at: Date;
    }[]
  > {
    return this.reviewsService.findMine(req.user.sub);
  }

  @Get("service-order/:orderId")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({
    summary: "List reviews of an order (order parties only)",
  })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({
    status: 200,
    description: "Order review list returned successfully",
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  @ApiResponse({
    status: 403,
    description: "User is not a party to the order",
  })
  async findByOrder(
    @Request() req: any,
    @Param("orderId") orderId: string,
  ): Promise<
    {
      id: string;
      service_order_id: string;
      reviewer_id: string;
      reviewee_id: string;
      rating: number;
      comment: string | null;
      created_at: Date;
      updated_at: Date;
    }[]
  > {
    return this.reviewsService.findByOrder(orderId, req.user.sub);
  }

  @Patch(":reviewId")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({
    summary: "Edit own review (only within the first 5 minutes)",
  })
  @ApiParam({ name: "reviewId", description: "Review ID" })
  @ApiResponse({
    status: 200,
    description: "Review updated successfully",
  })
  @ApiResponse({ status: 404, description: "Review not found" })
  @ApiResponse({
    status: 403,
    description: "User is not the review author",
  })
  @ApiResponse({
    status: 400,
    description: "Edit window expired or no field provided",
  })
  async update(
    @Request() req: any,
    @Param("reviewId") reviewId: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<{
    id: string;
    service_order_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    comment: string | null;
    created_at: Date;
    updated_at: Date;
  }> {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.reviewsService.update(userId, reviewId, dto, ip);
  }

  @Delete(":reviewId")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Delete own review" })
  @ApiParam({ name: "reviewId", description: "Review ID" })
  @ApiResponse({
    status: 200,
    description: "Review deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Review not found" })
  @ApiResponse({
    status: 403,
    description: "User is not the review author",
  })
  async remove(@Request() req: any, @Param("reviewId") reviewId: string) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.reviewsService.remove(userId, reviewId, ip);
  }
}

@ApiTags("Reviews")
@Controller("reviews/provider/:providerId")
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: "List provider reviews (public)" })
  @ApiParam({ name: "providerId", description: "Provider ID" })
  @ApiResponse({
    status: 200,
    description: "Provider review list returned successfully",
  })
  async findByProvider(
    @Param("providerId") providerId: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.reviewsService.findByProvider(providerId, limit);
  }
}
