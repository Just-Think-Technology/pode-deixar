import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

// Cap page size to avoid oversized responses.
export const DEFAULT_PAGINATION_TAKE = 20;
export const MAX_PAGINATION_TAKE = 50;

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Number of records to skip",
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "skip deve ser um número inteiro" })
  @Min(0, { message: "skip deve ser maior ou igual a 0" })
  skip?: number = 0;

  @ApiPropertyOptional({
    description: "Maximum number of records (max 50)",
    default: DEFAULT_PAGINATION_TAKE,
    example: DEFAULT_PAGINATION_TAKE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "take deve ser um número inteiro" })
  @Min(1, { message: "take deve ser maior ou igual a 1" })
  @Max(MAX_PAGINATION_TAKE, {
    message: `take deve ser no máximo ${MAX_PAGINATION_TAKE}`,
  })
  take?: number = DEFAULT_PAGINATION_TAKE;
}

export interface PaginationQuery {
  skip?: number;
  take?: number;
}

// Defense in depth beyond the DTO: enforce defaults and caps on internal calls.
export function normalizePagination(pagination?: PaginationQuery): {
  skip: number;
  take: number;
} {
  let skip = Math.floor(pagination?.skip ?? 0);
  if (!Number.isFinite(skip) || skip < 0) {
    skip = 0;
  }

  let take = Math.floor(pagination?.take ?? DEFAULT_PAGINATION_TAKE);
  if (!Number.isFinite(take) || take < 1) {
    take = DEFAULT_PAGINATION_TAKE;
  }
  if (take > MAX_PAGINATION_TAKE) {
    take = MAX_PAGINATION_TAKE;
  }

  return { skip, take };
}
