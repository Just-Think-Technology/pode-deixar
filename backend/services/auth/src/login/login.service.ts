import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { LoginRepository } from './login.repository';
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
    private repository: LoginRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private authLogger: AuthLoggerService,
    private passwordService: PasswordService,
    private emailService: EmailService,
  ) {
    requireJwtSecrets(configService);
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.repository.findUserByEmail(dto.email);

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

        await this.repository.lockAccount(user.id, newAttempts, lockoutUntil);

        this.authLogger.logSecurityEvent('account_locked', {
          email: dto.email,
          attempts: newAttempts,
          lockoutUntil,
          ip,
        });

        throw new UnauthorizedException('Credenciais inválidas');
      } else {
        await this.repository.incrementFailedAttempts(user.id, newAttempts);
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

    await this.repository.resetLoginState(user.id);

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    await this.repository.storeRefreshTokenHash(
      user.id,
      this.hashRefreshToken(refreshToken),
    );

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

      const user = await this.repository.findUserByIdAndRefreshToken(
        payload.sub,
        hashedIncoming,
      );

      if (!user) {
        await this.repository.clearRefreshTokenByUserId(payload.sub);
        throw new UnauthorizedException('Token de atualização inválido');
      }

      await this.repository.clearRefreshToken(user.id);

      const newAccessToken = await this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user);

      await this.repository.storeNewRefreshToken(
        user.id,
        this.hashRefreshToken(newRefreshToken),
      );

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
    const user = await this.repository.findUserEmailById(userId);

    await this.repository.clearRefreshToken(userId);

    try {
      if (accessTokenJti) {
        await this.repository.blacklistToken(
          accessTokenJti,
          new Date(Date.now() + 15 * 60 * 1000),
        );
      }

      await this.repository.pruneExpiredTokens();
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
    await this.repository.updateVerificationHint(
      userId,
      this.hashToken(rawToken),
      expiresAt,
    );
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
