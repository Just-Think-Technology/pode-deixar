// Provider reviews query — page and limit with defaults 1/10 and cap 50

import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { PageQueryDto } from "@pode-deixar/validation";

export class FindByProviderQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: "Items per page (max 50)",
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limite deve ser um número inteiro" })
  @Min(1, { message: "Limite não pode ser menor que 1" })
  @Max(50, { message: "Limite não pode ser maior que 50" })
  limit?: number = 10;
}
