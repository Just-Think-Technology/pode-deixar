// JWT strategy — access-token validation and revocation check

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistRepository } from './token-blacklist.repository';
import { AuthLoggerService } from '../shared/auth-logger.service';
import getLogger from '../shared/shared-logger';
import { JWT_ALGORITHMS, JWT_AUDIENCE, JWT_ISSUER } from './jwt.constants';
import { AccessTokenPayload } from './access-token-payload';

const logger = getLogger('jwt');

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private repository: TokenBlacklistRepository,
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

    const user = await this.repository.findUserById(payload.sub);

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
      const blacklisted = await this.repository.findBlacklistedToken(
        payload.jti,
      );
      return !!blacklisted;
    } catch (e: any) {
      if (e?.code !== 'P2021') throw e;
      this.authLogger.logSecurityEvent('token_blacklist_table_missing', {
        userId: payload.sub,
        message:
          'token_blacklist table missing, access token accepted without revocation check',
      });
      return false;
    }
  }
}
