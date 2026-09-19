import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RegisterService } from '../src/register/register.service';
import { RegisterRepository } from '../src/register/register.repository';
import { AuthLoggerService } from '../src/shared/auth-logger.service';
import { EmailService } from '@pode-deixar/email';
import { PasswordService } from '../src/password/password.service';

describe('RegisterService', () => {
  let service: RegisterService;

  const mockRepository = {
    findUserByEmail: jest.fn(),
    updateVerificationToken: jest.fn(),
    createUserWithProfile: jest.fn(),
    findUserByVerificationTokenHash: jest.fn(),
    markEmailVerified: jest.fn(),
  };

  const mockLogger = {
    logRegistration: jest.fn(),
    logSecurityEvent: jest.fn(),
    logEmailVerification: jest.fn(),
    logEmailVerificationTokenFailure: jest.fn(),
    logResendVerification: jest.fn(),
  };

  const mockEmail = {
    sendEmailVerification: jest.fn(),
  };

  const mockPasswords = {
    hash: jest.fn(),
  };

  const baseDto = {
    complete_name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    confirm_password: 'TestPassword123!',
    phone: '+1234567890',
    postal_code: '12345-678',
    role: 'CLIENT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterService,
        { provide: RegisterRepository, useValue: mockRepository },
        { provide: AuthLoggerService, useValue: mockLogger },
        { provide: EmailService, useValue: mockEmail },
        { provide: PasswordService, useValue: mockPasswords },
      ],
    }).compile();

    service = module.get<RegisterService>(RegisterService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return safe data', async () => {
      mockRepository.findUserByEmail.mockResolvedValue(null);
      mockPasswords.hash.mockResolvedValue('hashed');
      mockRepository.createUserWithProfile.mockResolvedValue([
        {
          id: 'user-1',
          completeName: 'Test User',
          email: 'test@example.com',
          role: 'CLIENT',
          phone: '+1234567890',
          postalCode: '12345-678',
          emailVerified: false,
          createdAt: new Date(),
        },
      ]);
      mockEmail.sendEmailVerification.mockResolvedValue(true);

      const result: any = await service.register(baseDto as any);

      expect(result.message).toContain('Usuário cadastrado com sucesso');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('password');
      expect(mockRepository.createUserWithProfile).toHaveBeenCalled();
      expect(mockLogger.logRegistration).toHaveBeenCalled();
    });

    it('should reject mismatched passwords with 400', async () => {
      await expect(
        service.register({
          ...baseDto,
          confirm_password: 'Different123!',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return the generic response for an existing email', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        emailVerified: true,
      });

      const result = await service.register(baseDto as any);

      expect(result.message).toContain('Usuário cadastrado com sucesso');
      expect(mockRepository.createUserWithProfile).not.toHaveBeenCalled();
      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'register_existing_email',
        expect.anything(),
      );
    });

    it('should rotate the verification token for an unverified existing email', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        emailVerified: false,
      });
      mockEmail.sendEmailVerification.mockResolvedValue(true);

      await service.register(baseDto as any);

      expect(mockRepository.updateVerificationToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Date),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify a valid token', async () => {
      mockRepository.findUserByVerificationTokenHash.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: false,
        emailVerificationExpires: new Date(Date.now() + 60 * 60 * 1000),
      });

      const result = await service.verifyEmail({ token: 'raw-token' });

      expect(result.message).toBe('Email verificado com sucesso');
      expect(mockRepository.markEmailVerified).toHaveBeenCalledWith('user-1');
    });

    it('should reject an invalid token with 400', async () => {
      mockRepository.findUserByVerificationTokenHash.mockResolvedValue(null);

      await expect(service.verifyEmail({ token: 'bad' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject an already verified email with 400', async () => {
      mockRepository.findUserByVerificationTokenHash.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        emailVerificationExpires: new Date(Date.now() + 60 * 60 * 1000),
      });

      await expect(service.verifyEmail({ token: 'raw' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject an expired token with 400', async () => {
      mockRepository.findUserByVerificationTokenHash.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: false,
        emailVerificationExpires: new Date(Date.now() - 1000),
      });

      await expect(service.verifyEmail({ token: 'raw' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resendVerificationEmail', () => {
    it('should return the generic message for an unknown email', async () => {
      mockRepository.findUserByEmail.mockResolvedValue(null);

      const result = await service.resendVerificationEmail({
        email: 'unknown@example.com',
      });

      expect(result.message).toContain('Se o email existir');
      expect(mockRepository.updateVerificationToken).not.toHaveBeenCalled();
    });

    it('should return the generic message for an already verified email', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        emailVerified: true,
      });

      const result = await service.resendVerificationEmail({
        email: 'test@example.com',
      });

      expect(result.message).toContain('Se o email existir');
      expect(mockRepository.updateVerificationToken).not.toHaveBeenCalled();
    });

    it('should rotate the token for an unverified email', async () => {
      mockRepository.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        emailVerified: false,
      });
      mockEmail.sendEmailVerification.mockResolvedValue(true);

      const result = await service.resendVerificationEmail({
        email: 'test@example.com',
      });

      expect(result.message).toContain('Se o email existir');
      expect(mockRepository.updateVerificationToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Date),
      );
    });
  });
});
