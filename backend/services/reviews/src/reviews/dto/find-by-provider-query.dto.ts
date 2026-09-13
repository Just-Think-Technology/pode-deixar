import { ApiPropertyOptional } from "@nestjs/swagger";
import { PageQueryDto } from "@pode-deixar/validation";

export class FindByProviderQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: "Items per page (max 50)",
    example: 50,
    default: 50,
  })
  limit?: number = 50;
}
