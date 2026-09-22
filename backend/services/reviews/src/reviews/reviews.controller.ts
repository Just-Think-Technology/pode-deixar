// Reviews controller — review management endpoints

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
  ParseUUIDPipe,
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
import { FindByProviderQueryDto } from "./dto/find-by-provider-query.dto";
import { CreateReviewResponseDto } from "./dto/create-review-response.dto";
import { UpdateReviewResponseDto } from "./dto/update-review-response.dto";
import { CreateReviewReportDto } from "./dto/create-review-report.dto";
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";

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

  @Get("received")
  @Roles("PROVIDER")
  @ApiOperation({ summary: "List received reviews (provider only)" })
  @ApiResponse({
    status: 200,
    description: "Received review list returned successfully",
  })
  @ApiResponse({ status: 403, description: "Only providers may access" })
  async findReceived(
    @Request() req: any,
    @Query() query: FindByProviderQueryDto,
  ) {
    return this.reviewsService.findReceived(req.user.sub, query);
  }

  @Post(":reviewId/response")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Create response for a review (reviewee only)" })
  @ApiParam({ name: "reviewId", description: "Review ID" })
  @ApiResponse({ status: 201, description: "Response created successfully" })
  @ApiResponse({ status: 404, description: "Review not found" })
  @ApiResponse({ status: 403, description: "Only reviewee may respond" })
  @ApiResponse({ status: 409, description: "Response already exists" })
  async createResponse(
    @Request() req: any,
    @Param("reviewId", ParseUUIDPipe) reviewId: string,
    @Body() dto: CreateReviewResponseDto,
  ) {
    return this.reviewsService.createResponse(req.user.sub, reviewId, dto);
  }

  @Patch(":reviewId/response")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Update response for a review (reviewee only)" })
  @ApiParam({ name: "reviewId", description: "Review ID" })
  @ApiResponse({ status: 200, description: "Response updated successfully" })
  @ApiResponse({ status: 404, description: "Review or response not found" })
  @ApiResponse({ status: 403, description: "Only reviewee may respond" })
  async updateResponse(
    @Request() req: any,
    @Param("reviewId", ParseUUIDPipe) reviewId: string,
    @Body() dto: UpdateReviewResponseDto,
  ) {
    return this.reviewsService.updateResponse(req.user.sub, reviewId, dto);
  }

  @Post(":reviewId/reports")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Report a review (reviewee only)" })
  @ApiParam({ name: "reviewId", description: "Review ID" })
  @ApiResponse({ status: 201, description: "Report created successfully" })
  @ApiResponse({ status: 404, description: "Review not found" })
  @ApiResponse({ status: 403, description: "Only reviewee may report" })
  @ApiResponse({ status: 409, description: "Denúncia já em análise" })
  async createReport(
    @Request() req: any,
    @Param("reviewId", ParseUUIDPipe) reviewId: string,
    @Body() dto: CreateReviewReportDto,
  ) {
    return this.reviewsService.createReport(req.user.sub, reviewId, dto);
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
    @Param("orderId", ParseUUIDPipe) orderId: string,
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
    @Param("reviewId", ParseUUIDPipe) reviewId: string,
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
  async remove(
    @Request() req: any,
    @Param("reviewId", ParseUUIDPipe) reviewId: string,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.reviewsService.remove(userId, reviewId, ip);
  }
}

@ApiTags("Reviews")
@Controller("reviews/provider/:providerId")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("summary")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Get provider reviews summary" })
  @ApiParam({ name: "providerId", description: "Provider ID" })
  @ApiResponse({
    status: 200,
    description: "Provider review summary returned successfully",
  })
  @ApiResponse({ status: 404, description: "Provider not found" })
  async getSummary(@Param("providerId", ParseUUIDPipe) providerId: string) {
    return this.reviewsService.getProviderSummary(providerId);
  }

  @Get()
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "List provider reviews (paginated)" })
  @ApiParam({ name: "providerId", description: "Provider ID" })
  @ApiResponse({
    status: 200,
    description: "Provider review list returned successfully",
  })
  @ApiResponse({ status: 404, description: "Provider not found" })
  async findByProvider(
    @Param("providerId", ParseUUIDPipe) providerId: string,
    @Query() query: FindByProviderQueryDto,
  ) {
    return this.reviewsService.findByProvider(providerId, query);
  }
}
