// Prisma error resolver — maps error codes to HTTP status

import { HttpStatus } from '@nestjs/common';

export interface ErroPrismaResolvido {
  status: number;
  message: string;
}

// Maps known Prisma error codes to generic responses (without leaking
// internal details). Returns undefined for unknown codes — the caller
// decides the fallback (generally generic 500 with detail only in log).
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
