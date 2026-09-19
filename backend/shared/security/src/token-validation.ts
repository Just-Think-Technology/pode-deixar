// Token validation — payload checks and revocation lookup

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

// Token revocation check against blacklist. Fail-closed: if the blacklist
// table is missing (P2021) the revocation check cannot be performed, so the
// token is rejected rather than accepted.
export async function checkTokenRevocation(
  findBlacklisted: (jti: string) => Promise<unknown>,
  jti: string | undefined,
) {
  if (!jti) {
    return;
  }

  const blacklisted = await findBlacklisted(jti);

  if (blacklisted) {
    throw new UnauthorizedException("Token revogado");
  }
}
