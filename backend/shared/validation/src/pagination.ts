import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

// Cap page size to avoid oversized responses.
export const DEFAULT_PAGINATION_TAKE = 20;
export const MAX_PAGINATION_TAKE = 50;
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;

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

export interface PageQuery {
  page?: number;
  limit?: number;
}

// 1-based page/limit variant. Subclasses may redeclare `limit` with their own
// default; the base validators still apply through the prototype chain.
export class PageQueryDto {
  @ApiPropertyOptional({
    description: "Page number",
    example: 1,
    default: DEFAULT_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Página deve ser um número inteiro" })
  @Min(1, { message: "Página não pode ser menor que 1" })
  page?: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: "Items per page (max 50)",
    example: DEFAULT_PAGE_LIMIT,
    default: DEFAULT_PAGE_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limite deve ser um número inteiro" })
  @Min(1, { message: "Limite não pode ser menor que 1" })
  @Max(MAX_PAGINATION_TAKE, {
    message: `Limite não pode ser maior que ${MAX_PAGINATION_TAKE}`,
  })
  limit?: number = DEFAULT_PAGE_LIMIT;
}

// Convert page/limit to skip/take, enforcing the shared caps.
export function toSkipTake(
  query?: PageQuery,
  defaultLimit: number = DEFAULT_PAGE_LIMIT,
): { skip: number; take: number } {
  let page = Math.floor(query?.page ?? DEFAULT_PAGE);
  if (!Number.isFinite(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  const { take } = normalizePagination({ take: query?.limit ?? defaultLimit });
  return { skip: (page - 1) * take, take };
}
