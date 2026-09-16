import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@pode-deixar/prisma';
import { VerifyRepository } from '../src/verify/verify.repository';

describe('VerifyRepository', () => {
  let repository: VerifyRepository;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    tokenBlacklist: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<VerifyRepository>(VerifyRepository);
    jest.clearAllMocks();
  });

  it('finds a blacklisted token by jti', async () => {
    mockPrisma.tokenBlacklist.findUnique.mockResolvedValue({ jti: 'jti-1' });

    await repository.findBlacklistedToken('jti-1');

    expect(mockPrisma.tokenBlacklist.findUnique).toHaveBeenCalledWith({
      where: { jti: 'jti-1' },
    });
  });

  it('finds a user by id with the verify select', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await repository.findUserById('user-1');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: {
        id: true,
        completeName: true,
        email: true,
        role: true,
      },
    });
  });
});
