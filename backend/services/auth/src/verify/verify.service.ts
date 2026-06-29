import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthLoggerService } from '../shared/auth-logger.service';

@Injectable()
export class VerifyService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private authLogger: AuthLoggerService,
  ) {}

  async verify(accessToken: string | null) {
    if (!accessToken) {
      this.authLogger.logTokenVerification('none', false, 'no_token');
      return { authorized: false, access_token: null };
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(accessToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      this.authLogger.logTokenVerification('unknown', false, 'invalid_token');
      return { authorized: false, access_token: accessToken };
    }

    if (payload.type !== 'access') {
      this.authLogger.logTokenVerification(
        'unknown',
        false,
        'not_an_access_token',
      );
      return { authorized: false, access_token: accessToken };
    }

    if (payload.jti) {
      try {
        const blacklisted = await this.prisma.tokenBlacklist.findUnique({
          where: { jti: payload.jti },
        });

        if (blacklisted) {
          this.authLogger.logTokenVerification(
            payload.sub,
            false,
            'token_revoked',
          );
          return { authorized: false, access_token: accessToken };
        }
      } catch (e: any) {
        if (e?.code !== 'P2021') throw e;
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        completeName: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      this.authLogger.logTokenVerification(
        payload.sub,
        false,
        'user_not_found',
      );
      return { authorized: false, access_token: accessToken };
    }

    if (user.email !== payload.email) {
      this.authLogger.logTokenVerification(
        payload.sub,
        false,
        'email_mismatch',
      );
      return { authorized: false, access_token: accessToken };
    }

    if (user.role !== payload.role) {
      this.authLogger.logTokenVerification(payload.sub, false, 'role_mismatch');
      return { authorized: false, access_token: accessToken };
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
}
