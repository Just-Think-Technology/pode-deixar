import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@pode-deixar/prisma';
import { PasswordManagementRepository } from '../src/password/password-management.repository';

describe('PasswordManagementRepository', () => {
  let repository: PasswordManagementRepository;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    tokenBlacklist: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordManagementRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PasswordManagementRepository>(
      PasswordManagementRepository,
    );
    jest.clearAllMocks();
  });

  it('finds a user by email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await repository.findUserByEmail('test@example.com');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('stores the password reset token', async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    await repository.storePasswordResetToken('user-1', 'hash-123', expiresAt);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordResetToken: 'hash-123',
        passwordResetExpires: expiresAt,
      },
    });
  });

  it('finds a user by valid reset token hash', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

    await repository.findUserByValidResetToken('hash-123');

    expect(mockPrisma.user.findFirst).toHaveBeenCalled();
    const args = mockPrisma.user.findFirst.mock.calls[0][0];
    expect(args.where.passwordResetToken).toBe('hash-123');
    expect(args.where.passwordResetExpires.gt).toBeInstanceOf(Date);
  });

  it('completes a password reset clearing sessions and lockout', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    await repository.completePasswordReset('user-1', 'hashed-new');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        password: 'hashed-new',
        passwordResetToken: null,
        passwordResetExpires: null,
        refreshToken: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
  });

  it('finds a user by id', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await repository.findUserById('user-1');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });

  it('updates the password and clears the refresh token', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    await repository.updatePasswordAndClearRefresh('user-1', 'hashed-new');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'hashed-new', refreshToken: null },
    });
  });

  it('blacklists a token with expiry', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    mockPrisma.tokenBlacklist.create.mockResolvedValue({ jti: 'jti-1' });

    await repository.blacklistToken('jti-1', expiresAt);

    expect(mockPrisma.tokenBlacklist.create).toHaveBeenCalledWith({
      data: { jti: 'jti-1', expiresAt },
    });
  });
});
