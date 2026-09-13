import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { PageQueryDto } from "@pode-deixar/validation";

export class SearchProvidersQueryDto extends PageQueryDto {
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
    description: "Items per page (max 50)",
    example: 10,
    default: 10,
  })
  limit?: number = 10;
}
