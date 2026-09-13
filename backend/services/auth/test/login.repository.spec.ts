import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@pode-deixar/prisma';
import { LoginRepository } from '../src/login/login.repository';

describe('LoginRepository', () => {
  let repository: LoginRepository;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    tokenBlacklist: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<LoginRepository>(LoginRepository);
    jest.clearAllMocks();
  });

  it('finds a user by email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await repository.findUserByEmail('test@example.com');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('locks an account with attempts and lockout date', async () => {
    const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    await repository.lockAccount('user-1', 5, lockoutUntil);

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        failedLoginAttempts: 5,
        lockoutUntil,
      },
    });
  });

  it('increments failed attempts', async () => {
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    await repository.incrementFailedAttempts('user-1', 2);

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { failedLoginAttempts: 2 },
    });
  });

  it('resets login state with a fresh lastLoginAt', async () => {
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    await repository.resetLoginState('user-1');

    expect(mockPrisma.user.updateMany).toHaveBeenCalled();
    const args = mockPrisma.user.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'user-1' });
    expect(args.data.failedLoginAttempts).toBe(0);
    expect(args.data.lockoutUntil).toBeNull();
    expect(args.data.lastLoginAt).toBeInstanceOf(Date);
  });

  it('stores the refresh token hash via updateMany', async () => {
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    await repository.storeRefreshTokenHash('user-1', 'hash-123');

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshToken: 'hash-123' },
    });
  });

  it('finds a user by id and refresh token hash', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

    await repository.findUserByIdAndRefreshToken('user-1', 'hash-123');

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', refreshToken: 'hash-123' },
    });
  });

  it('clears the refresh token via updateMany for rotation failures', async () => {
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    await repository.clearRefreshTokenByUserId('user-1');

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshToken: null },
    });
  });

  it('clears the refresh token via update for rotation and logout', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    await repository.clearRefreshToken('user-1');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshToken: null },
    });
  });

  it('stores a new refresh token via update', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    await repository.storeNewRefreshToken('user-1', 'hash-456');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshToken: 'hash-456' },
    });
  });

  it('finds the user email by id', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com' });

    await repository.findUserEmailById('user-1');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { email: true },
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

  it('prunes expired blacklist tokens', async () => {
    mockPrisma.tokenBlacklist.deleteMany.mockResolvedValue({ count: 1 });

    await repository.pruneExpiredTokens();

    expect(mockPrisma.tokenBlacklist.deleteMany).toHaveBeenCalled();
    const args = mockPrisma.tokenBlacklist.deleteMany.mock.calls[0][0];
    expect(args.where.expiresAt.lte).toBeInstanceOf(Date);
  });

  it('updates the verification hint via updateMany', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    await repository.updateVerificationHint('user-1', 'hash-123', expiresAt);

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        emailVerificationToken: 'hash-123',
        emailVerificationExpires: expiresAt,
      },
    });
  });
});
