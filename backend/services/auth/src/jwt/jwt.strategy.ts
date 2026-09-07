import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthLoggerService } from '../shared/auth-logger.service';
import getLogger from '../shared/shared-logger';
import { ALGORITMOS_JWT, AUDIENCIA_JWT, EMISSOR_JWT } from './jwt.constantes';

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
      algorithms: [...ALGORITMOS_JWT],
      issuer: EMISSOR_JWT,
      audience: AUDIENCIA_JWT,
    });
  }

  async validate(payload: any) {
    // Refresh tokens (ou qualquer tipo distinto de acesso) não autenticam.
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    if (payload.jti) {
      try {
        const blacklisted = await this.prisma.tokenBlacklist.findUnique({
          where: { jti: payload.jti },
        });

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
}
