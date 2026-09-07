import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

// Limites de paginação das listagens (proteção contra respostas gigantes)
export const PAGINACAO_PADRAO_TAKE = 20;
export const PAGINACAO_MAXIMO_TAKE = 50;

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Quantidade de registros a pular",
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "skip deve ser um número inteiro" })
  @Min(0, { message: "skip deve ser maior ou igual a 0" })
  skip?: number = 0;

  @ApiPropertyOptional({
    description: "Quantidade máxima de registros (máximo 50)",
    default: PAGINACAO_PADRAO_TAKE,
    example: PAGINACAO_PADRAO_TAKE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "take deve ser um número inteiro" })
  @Min(1, { message: "take deve ser maior ou igual a 1" })
  @Max(PAGINACAO_MAXIMO_TAKE, {
    message: `take deve ser no máximo ${PAGINACAO_MAXIMO_TAKE}`,
  })
  take?: number = PAGINACAO_PADRAO_TAKE;
}

export interface PaginacaoConsulta {
  skip?: number;
  take?: number;
}

// Normaliza a paginação no service (defesa em profundidade além do DTO):
// aplica padrão 20, mínimo 1 e teto 50 mesmo em chamadas internas.
export function normalizarPaginacao(paginacao?: PaginacaoConsulta): {
  skip: number;
  take: number;
} {
  let skip = Math.floor(paginacao?.skip ?? 0);
  if (!Number.isFinite(skip) || skip < 0) {
    skip = 0;
  }

  let take = Math.floor(paginacao?.take ?? PAGINACAO_PADRAO_TAKE);
  if (!Number.isFinite(take) || take < 1) {
    take = PAGINACAO_PADRAO_TAKE;
  }
  if (take > PAGINACAO_MAXIMO_TAKE) {
    take = PAGINACAO_MAXIMO_TAKE;
  }

  return { skip, take };
}
