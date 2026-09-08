import { UnauthorizedException } from "@nestjs/common";

export interface TokenPayload {
  sub?: unknown;
  role?: unknown;
  jti?: string;
}

// Rejeita tokens sem identidade: sem sub/role a requisição não tem
// dono nem permissões (regra compartilhada pelas strategies dos serviços).
export function assertTokenPayload(payload: TokenPayload | null | undefined) {
  if (!payload || !payload.sub || !payload.role) {
    throw new UnauthorizedException("Payload do token inválido");
  }
}

// Checagem de revogação contra a blacklist de tokens. Tabela ausente (P2021)
// significa que o serviço roda sem armazenamento de revogação, então o token
// é aceito; qualquer outra falha de lookup é relançada.
export async function checkTokenRevocation(
  findBlacklisted: (jti: string) => Promise<unknown>,
  jti: string | undefined,
) {
  if (!jti) {
    return;
  }

  try {
    const blacklisted = await findBlacklisted(jti);

    if (blacklisted) {
      throw new UnauthorizedException("Token revogado");
    }
  } catch (e: unknown) {
    if ((e as { code?: unknown })?.code !== "P2021") throw e;
  }
}
