// JWT strategy — access-token validation and revocation check

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@pode-deixar/prisma';
import { AuthLoggerService } from '../shared/auth-logger.service';
import getLogger from '../shared/shared-logger';
import { JWT_ALGORITHMS, JWT_AUDIENCE, JWT_ISSUER } from './jwt.constants';
import { AccessTokenPayload } from './access-token-payload';

const logger = getLogger('jwt');

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private authLogger: AuthLoggerService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      algorithms: [...JWT_ALGORITHMS],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  // --- Public API ---

  async validate(payload: AccessTokenPayload) {
    // Only access tokens authenticate here; refresh tokens are rejected.
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    if (payload.jti && (await this.isRevoked(payload))) {
      throw new UnauthorizedException('Token revogado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        completeName: true,
        email: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!user) {
      logger.error('auth.validate', `User not found for id ${payload.sub}`);
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return { ...user, jti: payload.jti };
  }

  // --- Private Helpers ---

  private async isRevoked(payload: AccessTokenPayload): Promise<boolean> {
    if (!payload.jti) {
      return false;
    }
    try {
      const blacklisted = await this.prisma.tokenBlacklist.findUnique({
        where: { jti: payload.jti },
      });
      return !!blacklisted;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2021'
      ) {
        this.authLogger.logSecurityEvent('token_blacklist_table_missing', {
          userId: payload.sub,
          message:
            'token_blacklist table missing, access token accepted without revocation check',
        });
        return false;
      }
      throw e;
    }
  }
}
