import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class SearchProvidersQueryDto {
  @ApiPropertyOptional({
    description: "Filtrar por categoria do serviço",
    example: "ELETRICA",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

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
