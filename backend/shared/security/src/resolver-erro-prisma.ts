import { HttpStatus } from '@nestjs/common';

export interface ErroPrismaResolvido {
  status: number;
  message: string;
}

// Mapeia códigos conhecidos do Prisma para respostas genéricas (sem vazar
// detalhes internos). Retorna undefined para códigos desconhecidos — o
// chamador decide o fallback (em geral, 500 genérico com detalhe só no log).
export function resolverErroPrisma(code: unknown): ErroPrismaResolvido | undefined {
  if (code === 'P2002') {
    return { status: HttpStatus.CONFLICT, message: 'Registro já existe' };
  }
  if (code === 'P2003') {
    return { status: HttpStatus.BAD_REQUEST, message: 'Referência inválida' };
  }
  if (code === 'P2025') {
    return { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado' };
  }
  return undefined;
}
