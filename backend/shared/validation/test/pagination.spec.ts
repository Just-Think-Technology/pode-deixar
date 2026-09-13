import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGINATION_TAKE,
  normalizePagination,
  PageQueryDto,
  PaginationQueryDto,
  toSkipTake,
} from '../index';

class CustomLimitQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  declare limit?: number;
}

async function messages(dto: object): Promise<string[]> {
  const errors = await validate(dto);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('normalizePagination', () => {
  it('aplica skip/take padrão sem entrada', () => {
    expect(normalizePagination()).toEqual({ skip: 0, take: 20 });
  });

  it('limita take ao máximo', () => {
    expect(normalizePagination({ skip: 5, take: 999 })).toEqual({
      skip: 5,
      take: MAX_PAGINATION_TAKE,
    });
  });

  it('normaliza valores inválidos para o padrão', () => {
    expect(normalizePagination({ skip: -3, take: 0 })).toEqual({
      skip: 0,
      take: 20,
    });
  });
});

describe('toSkipTake', () => {
  it('converte página/limite em skip/take', () => {
    expect(toSkipTake({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it('usa o limite padrão informado', () => {
    expect(toSkipTake({ page: 2 }, 10)).toEqual({ skip: 10, take: 10 });
  });

  it('limita take ao máximo compartilhado', () => {
    expect(toSkipTake({ page: 1, limit: 500 })).toEqual({
      skip: 0,
      take: MAX_PAGINATION_TAKE,
    });
  });

  it('normaliza página inválida para a primeira', () => {
    expect(toSkipTake({ page: -2, limit: 10 })).toEqual({ skip: 0, take: 10 });
  });
});

describe('PaginationQueryDto', () => {
  it('aceita skip/take válidos', async () => {
    const dto = plainToInstance(PaginationQueryDto, { skip: '5', take: '10' });
    expect(await messages(dto)).toEqual([]);
    expect(dto.skip).toBe(5);
  });

  it('rejeita take acima do máximo', async () => {
    const dto = plainToInstance(PaginationQueryDto, { take: 999 });
    expect(await messages(dto)).toEqual([
      `take deve ser no máximo ${MAX_PAGINATION_TAKE}`,
    ]);
  });
});

describe('PageQueryDto', () => {
  it('aplica os padrões de página e limite', () => {
    const dto = plainToInstance(PageQueryDto, {});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(DEFAULT_PAGE_LIMIT);
  });

  it('rejeita página e limite inválidos', async () => {
    const dto = plainToInstance(PageQueryDto, { page: 0, limit: 999 });
    expect(await messages(dto)).toEqual([
      'Página não pode ser menor que 1',
      `Limite não pode ser maior que ${MAX_PAGINATION_TAKE}`,
    ]);
  });

  it('mantém os validadores da base ao sobrescrever o padrão', async () => {
    const dto = plainToInstance(CustomLimitQueryDto, { limit: 999 });
    expect(dto.limit).toBe(999);
    expect(await messages(dto)).toEqual([
      `Limite não pode ser maior que ${MAX_PAGINATION_TAKE}`,
    ]);
  });
});
