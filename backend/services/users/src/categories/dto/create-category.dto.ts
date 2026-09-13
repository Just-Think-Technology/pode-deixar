// Category DTO — category creation validation

import { IsString, IsOptional, IsInt, Min, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({ description: "Category name", example: "Elétrica" })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "Slug for URL/filter", example: "eletrica" })
  @IsString()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({
    description: "Category description",
    example: "Serviços de elétrica residencial e comercial",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: "Icon name (Lucide)",
    example: "zap",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: "Display order", example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
