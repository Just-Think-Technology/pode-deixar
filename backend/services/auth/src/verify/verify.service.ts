// Verify service — access token validation

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { JWT_ALGORITHMS, JWT_AUDIENCE, JWT_ISSUER } from '../jwt/jwt.constants';
import { AccessTokenPayload } from '../jwt/access-token-payload';

@Injectable()
export class VerifyService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private authLogger: AuthLoggerService,
  ) {}

  // --- Public API ---

  /**
   * Validates an access token against signature, type, revocation list and
   * current user data. Every mismatch denies with a logged reason.
   */
  async verify(accessToken: string | null) {
    if (!accessToken) {
      return this.deny('no_token', 'none', null);
    }

    const payload = await this.decodeAccessToken(accessToken);
    if (!payload) {
      return this.deny('invalid_token', 'unknown', accessToken);
    }
    if (payload.type !== 'access') {
      return this.deny('not_an_access_token', 'unknown', accessToken);
    }
    if (await this.isRevoked(payload.jti)) {
      return this.deny('token_revoked', payload.sub, accessToken);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, completeName: true, email: true, role: true },
    });
    if (!user) {
      return this.deny('user_not_found', payload.sub, accessToken);
    }
    if (user.email !== payload.email) {
      return this.deny('email_mismatch', payload.sub, accessToken);
    }
    if (user.role !== payload.role) {
      return this.deny('role_mismatch', payload.sub, accessToken);
    }

    this.authLogger.logTokenVerification(payload.sub, true);
    return {
      authorized: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        complete_name: user.completeName,
      },
      access_token: accessToken,
    };
  }

  // --- Private Helpers ---

  private deny(reason: string, subject: string, token: string | null) {
    this.authLogger.logTokenVerification(subject, false, reason);
    return { authorized: false, access_token: token };
  }

  private async decodeAccessToken(
    accessToken: string,
  ): Promise<AccessTokenPayload | null> {
    try {
      const decoded: unknown = await this.jwtService.verifyAsync(accessToken, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        algorithms: [...JWT_ALGORITHMS],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      return decoded as AccessTokenPayload;
    } catch {
      return null;
    }
  }

  private async isRevoked(jti?: string): Promise<boolean> {
    if (!jti) {
      return false;
    }
    try {
      const blacklisted = await this.prisma.tokenBlacklist.findUnique({
        where: { jti },
      });
      return !!blacklisted;
    } catch (e) {
      // tolerate a missing table (migration not run yet); fail open here
      // because logout still clears the refresh token server-side
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code !== 'P2021'
      ) {
        throw e;
      }
      return false;
    }
  }
}
