import { Controller, Get, Query, UseGuards, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";
import { FinanceItemsQueryDto } from "./dto/finance-items-query.dto";
import { FinanceChartQueryDto } from "./dto/finance-chart-query.dto";

@ApiTags("Provider Finance")
@Controller("payments/provider/me/finance")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProviderFinanceController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("summary")
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Financial summary of the authenticated provider",
    description:
      "Totals computed in the backend (source of truth): platform fee, net receivable, pending and received this month.",
  })
  @ApiResponse({
    status: 200,
    description: "Financial summary returned successfully",
  })
  async summary(@Request() req: any): Promise<{
    currency: string;
    feeRate: number;
    pendingNet: number;
    grossToReceive: number;
    feesOnToReceive: number;
    toReceiveNet: number;
    receivedThisMonthNet: number;
    feesThisMonth: number;
  }> {
    return this.paymentsService.getProviderFinanceSummary(req.user.sub);
  }

  @Get("items")
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "List financial items of the authenticated provider",
    description:
      "Payments for orders where the authenticated provider owns the accepted proposal.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter by client payment status",
    enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"],
  })
  @ApiResponse({
    status: 200,
    description: "Financial items list returned successfully",
  })
  async items(
    @Request() req: any,
    @Query() query: FinanceItemsQueryDto,
  ): Promise<
    {
      paymentId: string;
      proposalId: string | undefined;
      serviceOrderId: string;
      paymentStatus: string;
      method: string;
      grossAmount: number;
      feeAmount: number | null;
      netAmount: number | null;
      feeRate: number | null;
      paidAt: Date | null;
      createdAt: Date;
    }[]
  > {
    return this.paymentsService.getProviderFinanceItems(
      req.user.sub,
      query.status,
    );
  }

  @Get("chart")
  @Roles("PROVIDER")
  @ApiOperation({
    summary: "Monthly chart of the authenticated provider",
    description:
      "Net amounts received and fees retained per month (PAID payments), including empty months as zeros.",
  })
  @ApiQuery({
    name: "months",
    required: false,
    description:
      "Number of months (including the current one) — default 6, max 24",
    example: 6,
  })
  @ApiResponse({
    status: 200,
    description: "Monthly data returned successfully",
  })
  async chart(
    @Request() req: any,
    @Query() query: FinanceChartQueryDto,
  ): Promise<
    {
      month: string;
      netReceived: number;
      feesRetained: number;
    }[]
  > {
    return this.paymentsService.getProviderFinanceChart(
      req.user.sub,
      query.months ?? 6,
    );
  }
}
