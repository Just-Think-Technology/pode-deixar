// Login service — authentication and token rotation

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
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
const INVALID_CREDENTIALS = 'Credenciais inválidas';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
const DEFAULT_MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MINUTES = 15;

type SessionUser = Pick<User, 'id' | 'email' | 'role'>;

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
    // Reject boot on weak secrets instead of operating insecurely.
    requireJwtSecrets(configService);
  }

  // --- Public API ---

  /**
   * Authenticates a user by email and password, issuing a token pair.
   * Every failure returns a generic 401 so responses never reveal whether
   * the email exists, the account is locked, or the email is unverified.
   */
  async login(dto: LoginDto, ip?: string) {
    const user = await this.findUserByEmailOrThrow(dto.email, ip);
    this.rejectIfLocked(user, dto.email, ip);
    await this.verifyPasswordOrThrow(user, dto.password, dto.email, ip);
    await this.rejectIfUnverified(user, dto.email, ip);
    return this.issueSession(user, dto.email, ip);
  }

  private async findUserByEmailOrThrow(email: string, ip?: string) {
    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      this.authLogger.logLoginAttempt(email, false, ip);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return user;
  }

  private rejectIfLocked(user: User, email: string, ip?: string): void {
    // anti-enumeration: generic 401 for locked accounts; lockout counters managed in DB
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      this.authLogger.logSecurityEvent('account_locked_attempt', {
        email,
        lockoutUntil: user.lockoutUntil,
        ip,
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
  }

  private async verifyPasswordOrThrow(
    user: User,
    password: string,
    email: string,
    ip?: string,
  ): Promise<void> {
    const isPasswordValid = await this.passwordService.verify(
      user.password,
      password,
    );
    if (isPasswordValid) {
      return;
    }

    const newAttempts = user.failedLoginAttempts + 1;
    const maxAttempts =
      this.configService.get<number>('MAX_LOGIN_ATTEMPTS') ||
      DEFAULT_MAX_LOGIN_ATTEMPTS;
    const lockoutMinutes =
      this.configService.get<number>('LOCKOUT_DURATION_MINUTES') ||
      DEFAULT_LOCKOUT_MINUTES;

    if (newAttempts < maxAttempts) {
      await this.repository.incrementFailedAttempts(user.id, newAttempts);
      this.authLogger.logLoginAttempt(email, false, ip);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const lockoutUntil = new Date(Date.now() + lockoutMinutes * MS_PER_MINUTE);
    await this.repository.lockAccount(user.id, newAttempts, lockoutUntil);
    this.authLogger.logSecurityEvent('account_locked', {
      email,
      attempts: newAttempts,
      lockoutUntil,
      ip,
    });
    throw new UnauthorizedException(INVALID_CREDENTIALS);
  }

  private async rejectIfUnverified(
    user: User,
    email: string,
    ip?: string,
  ): Promise<void> {
    // anti-enumeration: generic 401 for unverified emails; verification hint resent best-effort
    if (user.emailVerified) {
      return;
    }
    this.authLogger.logLoginAttempt(email, false, ip);
    this.authLogger.logSecurityEvent('email_not_verified', { email, ip });
    await this.resendVerificationHint(user.id, user.email);
    throw new UnauthorizedException(INVALID_CREDENTIALS);
  }

  private async issueSession(user: User, email: string, ip?: string) {
    await this.repository.resetLoginState(user.id);

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    await this.repository.storeRefreshTokenHash(user.id, this.hashRefreshToken(refreshToken));

    this.authLogger.logLoginAttempt(email, true, ip);

    return {
      message: 'Login realizado com sucesso',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      token_type: 'Bearer',
      user: {
        id: user.id,
        complete_name: user.completeName,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Rotates a refresh token, issuing a fresh token pair.
   * Reused or unknown tokens invalidate the stored token to contain theft.
   */
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: [...JWT_ALGORITHMS],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      const hashedIncoming = this.hashRefreshToken(dto.refreshToken);

      const user = await this.repository.findUserByIdAndRefreshToken(payload.sub, hashedIncoming);

      if (!user) {
        await this.repository.clearRefreshTokenByUserId(payload.sub);
        throw new UnauthorizedException('Token de atualização inválido');
      }

      await this.repository.clearRefreshToken(user.id);

      const newAccessToken = await this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user);

      await this.repository.storeNewRefreshToken(user.id, this.hashRefreshToken(newRefreshToken));

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

  /**
   * Ends a session: clears the stored refresh token and blacklists the
   * access token when its ID is provided.
   */
  async logout(userId: string, accessTokenJti?: string) {
    const user = await this.repository.findUserEmailById(userId);

    await this.repository.clearRefreshToken(userId);

    try {
      if (accessTokenJti) {
        await this.repository.blacklistToken(accessTokenJti, new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000));
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

  // --- Private Helpers ---

  private async generateAccessToken(user: SessionUser) {
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

  private async generateRefreshToken(user: SessionUser) {
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

  // best-effort verification hint resend without leaking account state
  private async resendVerificationHint(
    userId: string,
    email: string,
  ): Promise<void> {
    const rawToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    await this.repository.updateVerificationHint(userId, this.hashToken(rawToken), expiresAt);
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
