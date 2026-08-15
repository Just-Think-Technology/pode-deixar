import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export const MESES_MAXIMO_CHART = 24;

export class FinanceChartQueryDto {
  @ApiPropertyOptional({
    description:
      "Quantidade de meses (incluindo o atual) a considerar no gráfico",
    default: 6,
    minimum: 1,
    maximum: MESES_MAXIMO_CHART,
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MESES_MAXIMO_CHART)
  months?: number;
}
