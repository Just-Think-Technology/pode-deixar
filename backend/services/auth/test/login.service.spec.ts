import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginService } from '../src/login/login.service';
import { LoginRepository } from '../src/login/login.repository';
import { AuthLoggerService } from '../src/shared/auth-logger.service';
import { PasswordService } from '../src/password/password.service';
import { EmailService } from '@pode-deixar/email';

const ACCESS_SECRET = 'teste-access-secret-com-32-chars-minimo-0123456789abcdef';
const REFRESH_SECRET =
  'teste-refresh-secret-com-32-chars-minimo-0123456789abcdef';

describe('LoginService', () => {
  let service: LoginService;

  const mockRepository = {
    findUserByEmail: jest.fn(),
    lockAccount: jest.fn(),
    incrementFailedAttempts: jest.fn(),
    resetLoginState: jest.fn(),
    storeRefreshTokenHash: jest.fn(),
    findUserByIdAndRefreshToken: jest.fn(),
    clearRefreshTokenByUserId: jest.fn(),
    clearRefreshToken: jest.fn(),
    storeNewRefreshToken: jest.fn(),
    findUserEmailById: jest.fn(),
    blacklistToken: jest.fn(),
    pruneExpiredTokens: jest.fn(),
    updateVerificationHint: jest.fn(),
  };

  const mockJwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return ACCESS_SECRET;
      if (key === 'JWT_REFRESH_SECRET') return REFRESH_SECRET;
      if (key === 'MAX_LOGIN_ATTEMPTS') return 5;
      if (key === 'LOCKOUT_DURATION_MINUTES') return 15;
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return ACCESS_SECRET;
      if (key === 'JWT_REFRESH_SECRET') return REFRESH_SECRET;
      throw new Error(`Missing ${key}`);
    }),
  };

  const mockLogger = {
    logLoginAttempt: jest.fn(),
    logSecurityEvent: jest.fn(),
    logTokenRefresh: jest.fn(),
    logLogout: jest.fn(),
  };

  const mockPasswords = {
    verify: jest.fn(),
  };

  const mockEmail = {
    sendEmailVerification: jest.fn(),
  };

  const baseUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed',
    role: 'CLIENT',
    completeName: 'Test User',
    emailVerified: true,
    failedLoginAttempts: 0,
    lockoutUntil: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: LoginRepository, useValue: mockRepository },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuthLoggerService, useValue: mockLogger },
        { provide: PasswordService, useValue: mockPasswords },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<LoginService>(LoginService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({ ...baseUser });
      mockPasswords.verify.mockResolvedValue(true);
      mockJwt.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'TestPassword123!',
      } as any);

      expect(result.message).toBe('Login realizado com sucesso');
      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
      expect(mockRepository.resetLoginState).toHaveBeenCalledWith('user-1');
      expect(mockRepository.storeRefreshTokenHash).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
      );
    });

    it('should reject unknown email with 401', async () => {
      mockRepository.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'AnyPassword123!',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject a locked account with 401', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({
        ...baseUser,
        lockoutUntil: new Date(Date.now() + 10 * 60 * 1000),
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'TestPassword123!',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should increment attempts on wrong password', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({ ...baseUser });
      mockPasswords.verify.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        } as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRepository.incrementFailedAttempts).toHaveBeenCalledWith(
        'user-1',
        1,
      );
    });

    it('should lock the account at the max attempts', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({
        ...baseUser,
        failedLoginAttempts: 4,
      });
      mockPasswords.verify.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        } as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRepository.lockAccount).toHaveBeenCalledWith(
        'user-1',
        5,
        expect.any(Date),
      );
    });

    it('should reject unverified email with 401 and resend a hint', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({
        ...baseUser,
        emailVerified: false,
      });
      mockPasswords.verify.mockResolvedValue(true);
      mockEmail.sendEmailVerification.mockResolvedValue(true);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'TestPassword123!',
        } as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRepository.updateVerificationHint).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Date),
      );
    });
  });

  describe('refreshToken', () => {
    it('should rotate the token pair', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockRepository.findUserByIdAndRefreshToken.mockResolvedValue({
        ...baseUser,
      });
      mockJwt.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await service.refreshToken({
        refreshToken: 'old-refresh',
      } as any);

      expect(result.access_token).toBe('new-access');
      expect(result.refresh_token).toBe('new-refresh');
      expect(mockRepository.clearRefreshToken).toHaveBeenCalledWith('user-1');
      expect(mockRepository.storeNewRefreshToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
      );
    });

    it('should reject rotation reuse with 401 and clear the stored token', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockRepository.findUserByIdAndRefreshToken.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'reused' } as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRepository.clearRefreshTokenByUserId).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('should reject an invalid refresh token with 401', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(
        service.refreshToken({ refreshToken: 'bad' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear the refresh token and blacklist the access token', async () => {
      mockRepository.findUserEmailById.mockResolvedValue({
        email: 'test@example.com',
      });

      const result = await service.logout('user-1', 'jti-1');

      expect(result.message).toBe('Logout realizado com sucesso');
      expect(mockRepository.clearRefreshToken).toHaveBeenCalledWith('user-1');
      expect(mockRepository.blacklistToken).toHaveBeenCalledWith(
        'jti-1',
        expect.any(Date),
      );
      expect(mockRepository.pruneExpiredTokens).toHaveBeenCalled();
    });

    it('should tolerate a missing blacklist table (P2021)', async () => {
      const { Prisma } = await import('@prisma/client');
      mockRepository.findUserEmailById.mockResolvedValue({
        email: 'test@example.com',
      });
      mockRepository.blacklistToken.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('missing table', {
          code: 'P2021',
          clientVersion: '5.22.0',
        }),
      );

      const result = await service.logout('user-1', 'jti-1');

      expect(result.message).toBe('Logout realizado com sucesso');
      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'token_blacklist_table_missing',
        expect.anything(),
      );
    });
  });
});
