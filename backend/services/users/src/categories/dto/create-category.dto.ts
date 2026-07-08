import { IsString, IsOptional, IsInt, Min, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({ description: "Nome da categoria", example: "Elétrica" })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "Slug para URL/filtro", example: "eletrica" })
  @IsString()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({
    description: "Descrição da categoria",
    example: "Serviços de elétrica residencial e comercial",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: "Nome do ícone (Lucide)",
    example: "zap",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: "Ordem de exibição", example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
