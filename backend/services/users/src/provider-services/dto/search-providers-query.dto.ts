import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class SearchProvidersQueryDto {
  @ApiPropertyOptional({
    description: "Filtrar por ID da categoria",
    example: "uuid-da-categoria",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Texto para buscar no título ou descrição do serviço",
    example: "chuveiro",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
