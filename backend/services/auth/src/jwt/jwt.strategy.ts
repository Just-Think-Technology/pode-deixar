import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistRepository } from './token-blacklist.repository';
import { AuthLoggerService } from '../shared/auth-logger.service';
import getLogger from '../shared/shared-logger';
import { JWT_ALGORITHMS, JWT_AUDIENCE, JWT_ISSUER } from './jwt.constants';

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

  async validate(payload: any) {
    // Only access tokens authenticate here; refresh tokens are rejected.
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    if (payload.jti) {
      try {
        const blacklisted = await this.repository.findBlacklistedToken(
          payload.jti,
        );

        if (blacklisted) {
          throw new UnauthorizedException('Token revogado');
        }
      } catch (e: any) {
        if (e?.code !== 'P2021') throw e;
        this.authLogger.logSecurityEvent('token_blacklist_table_missing', {
          userId: payload.sub,
          message:
            'token_blacklist table missing, access token accepted without revocation check',
        });
      }
    }

    const user = await this.repository.findUserById(payload.sub);

    if (!user) {
      logger.error('auth.validate', `User not found for id ${payload.sub}`);
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return { ...user, jti: payload.jti };
  }
}
