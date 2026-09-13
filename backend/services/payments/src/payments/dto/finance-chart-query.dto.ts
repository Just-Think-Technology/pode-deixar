// Finance chart DTO — earnings chart query validation

import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export const MAX_CHART_MONTHS = 24;

export class FinanceChartQueryDto {
  @ApiPropertyOptional({
    description: "Number of months (including the current one) for the chart",
    default: 6,
    minimum: 1,
    maximum: MAX_CHART_MONTHS,
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CHART_MONTHS)
  months?: number;
}
