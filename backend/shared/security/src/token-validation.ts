import { UnauthorizedException } from "@nestjs/common";

export interface TokenPayload {
  sub?: unknown;
  role?: unknown;
  jti?: string;
}

// Reject tokens without identity: without sub/role the request has no owner
// or permissions (shared rule across service strategies).
export function assertTokenPayload(payload: TokenPayload | null | undefined) {
  if (!payload || !payload.sub || !payload.role) {
    throw new UnauthorizedException("Payload do token inválido");
  }
}

// Token revocation check against blacklist. Absence of the blacklist table
// (P2021) means the service runs without token revocation storage, so the
// token is accepted; any other lookup failure is re-thrown.
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
