import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { ProfilesRepository } from "../src/profiles/profiles.repository";

describe("ProfilesRepository", () => {
  let repository: ProfilesRepository;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    clientProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    providerProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ProfilesRepository>(ProfilesRepository);
    jest.clearAllMocks();
  });

  it("finds the public provider profile without exposing PII", async () => {
    mockPrisma.providerProfile.findUnique.mockResolvedValue({
      id: "provider-1",
    });

    await repository.findPublicProviderProfile("provider-1");

    expect(mockPrisma.providerProfile.findUnique).toHaveBeenCalledWith({
      where: { id: "provider-1" },
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
          },
        },
        services: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  });
});
