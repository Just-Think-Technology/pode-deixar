import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PasswordManagementService } from '../src/password/password-management.service';
import { PasswordManagementRepository } from '../src/password/password-management.repository';
import { AuthLoggerService } from '../src/shared/auth-logger.service';
import { EmailService } from '@pode-deixar/email';
import { PasswordService } from '../src/password/password.service';

describe('PasswordManagementService', () => {
  let service: PasswordManagementService;

  const mockRepository = {
    findUserByEmail: jest.fn(),
    storePasswordResetToken: jest.fn(),
    findUserByValidResetToken: jest.fn(),
    completePasswordReset: jest.fn(),
    findUserById: jest.fn(),
    updatePasswordAndClearRefresh: jest.fn(),
    blacklistToken: jest.fn(),
  };

  const mockLogger = {
    logPasswordResetRequested: jest.fn(),
    logPasswordReset: jest.fn(),
    logPasswordResetComplete: jest.fn(),
    logPasswordChange: jest.fn(),
    logSecurityEvent: jest.fn(),
  };

  const mockEmail = {
    sendPasswordReset: jest.fn(),
  };

  const mockPasswords = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordManagementService,
        {
          provide: PasswordManagementRepository,
          useValue: mockRepository,
        },
        { provide: AuthLoggerService, useValue: mockLogger },
        { provide: EmailService, useValue: mockEmail },
        { provide: PasswordService, useValue: mockPasswords },
      ],
    }).compile();

    service = module.get<PasswordManagementService>(
      PasswordManagementService,
    );
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('should return the generic message for an unknown email', async () => {
      mockRepository.findUserByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'unknown@example.com',
      });

      expect(result.message).toContain('Se o email existir');
      expect(mockRepository.storePasswordResetToken).not.toHaveBeenCalled();
    });

    it('should store a reset token for a known email', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({ id: 'user-1' });
      mockEmail.sendPasswordReset.mockResolvedValue(true);

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(result.message).toContain('Se o email existir');
      expect(mockRepository.storePasswordResetToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Date),
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset the password for a valid token', async () => {
      mockRepository.findUserByValidResetToken.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'CLIENT',
      });
      mockPasswords.hash.mockResolvedValue('hashed-new');

      const result = await service.resetPassword({
        token: 'raw-token',
        newPassword: 'NewPassword123!',
      } as any);

      expect(result.message).toBe('Senha redefinida com sucesso');
      expect(mockRepository.completePasswordReset).toHaveBeenCalledWith(
        'user-1',
        'hashed-new',
      );
    });

    it('should reject an invalid token with 400', async () => {
      mockRepository.findUserByValidResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'bad',
          newPassword: 'NewPassword123!',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('should change the password and blacklist the access token', async () => {
      mockRepository.findUserById.mockResolvedValue({
        id: 'user-1',
        password: 'hashed-old',
      });
      mockPasswords.verify.mockResolvedValue(true);
      mockPasswords.hash.mockResolvedValue('hashed-new');

      const result = await service.changePassword(
        'user-1',
        {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        } as any,
        'jti-1',
      );

      expect(result.message).toBe('Senha alterada com sucesso');
      expect(mockRepository.updatePasswordAndClearRefresh).toHaveBeenCalledWith(
        'user-1',
        'hashed-new',
      );
      expect(mockRepository.blacklistToken).toHaveBeenCalledWith(
        'jti-1',
        expect.any(Date),
      );
    });

    it('should reject an unknown user with 401', async () => {
      mockRepository.findUserById.mockResolvedValue(null);

      await expect(
        service.changePassword('unknown', {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject a wrong current password with 400', async () => {
      mockRepository.findUserById.mockResolvedValue({
        id: 'user-1',
        password: 'hashed-old',
      });
      mockPasswords.verify.mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'Wrong123!',
          newPassword: 'NewPassword123!',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should tolerate a missing blacklist table (P2021)', async () => {
      const { Prisma } = await import('@prisma/client');
      mockRepository.findUserById.mockResolvedValue({
        id: 'user-1',
        password: 'hashed-old',
      });
      mockPasswords.verify.mockResolvedValue(true);
      mockPasswords.hash.mockResolvedValue('hashed-new');
      mockRepository.blacklistToken.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('missing table', {
          code: 'P2021',
          clientVersion: '5.22.0',
        }),
      );

      const result = await service.changePassword(
        'user-1',
        {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        } as any,
        'jti-1',
      );

      expect(result.message).toBe('Senha alterada com sucesso');
      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'token_blacklist_table_missing',
        expect.anything(),
      );
    });
  });
});
