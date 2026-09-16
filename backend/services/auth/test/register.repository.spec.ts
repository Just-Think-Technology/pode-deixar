import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@pode-deixar/prisma';
import { RegisterRepository } from '../src/register/register.repository';

describe('RegisterRepository', () => {
  let repository: RegisterRepository;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    clientProfile: {
      create: jest.fn(),
    },
    providerProfile: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<RegisterRepository>(RegisterRepository);
    jest.clearAllMocks();
  });

  it('finds a user by email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await repository.findUserByEmail('test@example.com');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('updates the verification token for an existing user', async () => {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    await repository.updateVerificationToken('user-1', 'hash-123', expires);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        emailVerificationToken: 'hash-123',
        emailVerificationExpires: expires,
      },
    });
  });

  it('creates a CLIENT user with profile in one transaction', async () => {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
    mockPrisma.clientProfile.create.mockResolvedValue({ userId: 'user-1' });

    await repository.createUserWithProfile({
      completeName: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed',
      role: 'CLIENT',
      phone: '+1234567890',
      postalCode: '12345-678',
      emailVerificationTokenHash: 'token-hash',
      emailVerificationExpires: expires,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        completeName: 'Test User',
        email: 'test@example.com',
        password: 'hashed',
        role: 'CLIENT',
        phone: '+1234567890',
        postalCode: '12345-678',
        emailVerificationToken: 'token-hash',
        emailVerificationExpires: expires,
      },
      select: {
        id: true,
        completeName: true,
        email: true,
        role: true,
        phone: true,
        postalCode: true,
        emailVerified: true,
        createdAt: true,
        emailVerificationToken: true,
      },
    });
    expect(mockPrisma.clientProfile.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', preferences: {} },
    });
  });

  it('creates a PROVIDER user with profile in one transaction', async () => {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockPrisma.user.create.mockResolvedValue({ id: 'user-2' });
    mockPrisma.providerProfile.create.mockResolvedValue({ userId: 'user-2' });

    await repository.createUserWithProfile({
      completeName: 'Provider User',
      email: 'provider@example.com',
      passwordHash: 'hashed',
      role: 'PROVIDER',
      phone: '+1234567890',
      postalCode: '12345-678',
      emailVerificationTokenHash: 'token-hash',
      emailVerificationExpires: expires,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.providerProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-2',
        skills: [],
        portfolio: [],
        isAvailable: true,
      },
    });
  });

  it('finds a user by verification token hash', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

    await repository.findUserByVerificationTokenHash('hash-123');

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { emailVerificationToken: 'hash-123' },
    });
  });

  it('marks an email as verified', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    await repository.markEmailVerified('user-1');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  });
});
