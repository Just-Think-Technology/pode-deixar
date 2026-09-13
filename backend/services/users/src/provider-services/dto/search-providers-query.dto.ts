// Provider search DTO — provider discovery query validation

import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export class SearchProvidersQueryDto {
  @ApiPropertyOptional({
    description: "Filter by category ID",
    example: "uuid-da-categoria",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Text to search in service title or description",
    example: "chuveiro",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: "Client postal code for proximity ordering",
    example: "01001000",
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: "Page number",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page (max 50)",
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
