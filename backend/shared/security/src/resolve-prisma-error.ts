import { HttpStatus } from '@nestjs/common';

export interface ResolvedPrismaError {
  status: number;
  message: string;
}

// Maps known Prisma codes to generic responses (no internal detail leaks).
// Returns undefined for unknown codes — the caller decides the fallback
// (usually a generic 500 with detail only in the log).
export function resolvePrismaError(code: unknown): ResolvedPrismaError | undefined {
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
