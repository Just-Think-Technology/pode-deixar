import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";
import { Transform, Type } from "class-transformer";

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    description: "Filter by read state",
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : value === true || value === "true",
  )
  @IsBoolean({ message: "Filtro de leitura deve ser verdadeiro ou falso" })
  lido?: boolean;

  @ApiPropertyOptional({
    description: "Page number",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Página deve ser um número inteiro" })
  @Min(1, { message: "Página não pode ser menor que 1" })
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page (max 50)",
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limite deve ser um número inteiro" })
  @Min(1, { message: "Limite não pode ser menor que 1" })
  @Max(50, { message: "Limite não pode ser maior que 50" })
  limit?: number = 20;
}
