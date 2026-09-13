// Finance items DTO — earnings listing query validation

import { IsEnum, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentStatus } from "@prisma/client";

export class FinanceItemsQueryDto {
  @ApiPropertyOptional({
    description: "Filter items by client payment status",
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
