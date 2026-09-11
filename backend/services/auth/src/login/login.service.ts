import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@pode-deixar/prisma';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { PasswordService } from '../password/password.service';
import { EmailService } from '@pode-deixar/email';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { JWT_ALGORITHMS, JWT_AUDIENCE, JWT_ISSUER } from '../jwt/jwt.constants';

const MIN_JWT_SECRET_LENGTH = 32;

// Fail-closed JWT secret validation: requires present secrets with minimum length. Called at boot to prevent insecure operation.
export function requireJwtSecrets(config: ConfigService): void {
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const secret = config.get<string>(key);
    if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `Configuração insegura: ${key} ausente ou com menos de ${MIN_JWT_SECRET_LENGTH} caracteres`,
      );
    }
  }
}

@Injectable()
export class LoginService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private authLogger: AuthLoggerService,
    private passwordService: PasswordService,
    private emailService: EmailService,
  ) {
    requireJwtSecrets(configService);
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      this.authLogger.logLoginAttempt(dto.email, false, ip);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Locked accounts return a generic 401 (anti-enumeration); lockout counters stay managed in the DB by password verification.
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      this.authLogger.logSecurityEvent('account_locked_attempt', {
        email: dto.email,
        lockoutUntil: user.lockoutUntil,
        ip,
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await this.passwordService.verify(
      user.password,
      dto.password,
    );

    if (!isPasswordValid) {
      const newAttempts = user.failedLoginAttempts + 1;
      const maxAttempts =
        this.configService.get<number>('MAX_LOGIN_ATTEMPTS') || 5;
      const lockoutDuration =
        this.configService.get<number>('LOCKOUT_DURATION_MINUTES') || 15;

      if (newAttempts >= maxAttempts) {
        const lockoutUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);

        await this.prisma.user.updateMany({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockoutUntil,
          },
        });

        this.authLogger.logSecurityEvent('account_locked', {
          email: dto.email,
          attempts: newAttempts,
          lockoutUntil,
          ip,
        });

        throw new UnauthorizedException('Credenciais inválidas');
      } else {
        await this.prisma.user.updateMany({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts },
        });
      }

      this.authLogger.logLoginAttempt(dto.email, false, ip);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Unverified emails return a generic 401 (anti-enumeration); the verification hint is resent best-effort without leaking account state.
    if (!user.emailVerified) {
      this.authLogger.logLoginAttempt(dto.email, false, ip);
      this.authLogger.logSecurityEvent('email_not_verified', {
        email: dto.email,
        ip,
      });
      await this.resendVerificationHint(user.id, user.email);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.prisma.user.updateMany({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    await this.prisma.user.updateMany({
      where: { id: user.id },
      data: {
        refreshToken: this.hashRefreshToken(refreshToken),
      },
    });

    const expiresIn = 15 * 60;

    this.authLogger.logLoginAttempt(dto.email, true, ip);

    return {
      message: 'Login realizado com sucesso',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: 'Bearer',
      user: {
        id: user.id,
        complete_name: user.completeName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: [...JWT_ALGORITHMS],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      const hashedIncoming = this.hashRefreshToken(dto.refreshToken);

      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, refreshToken: hashedIncoming },
      });

      if (!user) {
        await this.prisma.user.updateMany({
          where: { id: payload.sub },
          data: { refreshToken: null },
        });
        throw new UnauthorizedException('Token de atualização inválido');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });

      const newAccessToken = await this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: this.hashRefreshToken(newRefreshToken) },
      });

      this.authLogger.logTokenRefresh(user.id, true);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.authLogger.logTokenRefresh('unknown', false);
      throw new UnauthorizedException('Token de atualização inválido');
    }
  }

  async logout(userId: string, accessTokenJti?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    try {
      if (accessTokenJti) {
        await this.prisma.tokenBlacklist.create({
          data: {
            jti: accessTokenJti,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
      }

      await this.prisma.tokenBlacklist.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2021'
      ) {
        this.authLogger.logSecurityEvent('token_blacklist_table_missing', {
          userId,
          message:
            'token_blacklist table missing, refresh token cleared but access token not blacklisted',
        });
      } else {
        throw error;
      }
    }

    this.authLogger.logLogout(userId, user?.email);

    return { message: 'Logout realizado com sucesso' };
  }

  private async generateAccessToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: crypto.randomUUID(),
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  private async generateRefreshToken(user: any) {
    const payload = {
      sub: user.id,
      type: 'refresh',
      jti: crypto.randomUUID(),
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  // Resends a verification hint best-effort without leaking account state or breaking the uniform 401.
  private async resendVerificationHint(
    userId: string,
    email: string,
  ): Promise<void> {
    const rawToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        emailVerificationToken: this.hashToken(rawToken),
        emailVerificationExpires: expiresAt,
      },
    });
    try {
      await this.emailService.sendEmailVerification(email, rawToken);
    } catch (error) {
      this.authLogger.logSecurityEvent('email_send_failed', {
        email,
        type: 'verification_hint',
        error: error.message,
      });
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
