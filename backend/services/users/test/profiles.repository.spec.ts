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

  it("finds a user by id with the profile select", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });

    await repository.findUserById("user-1");

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        completeName: true,
        email: true,
        phone: true,
        postalCode: true,
        role: true,
      },
    });
  });

  it("finds a client profile by user id", async () => {
    mockPrisma.clientProfile.findUnique.mockResolvedValue({ id: "client-1" });

    await repository.findClientProfileByUserId("user-1");

    expect(mockPrisma.clientProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("finds a provider profile by user id", async () => {
    mockPrisma.providerProfile.findUnique.mockResolvedValue({
      id: "provider-1",
    });

    await repository.findProviderProfileByUserId("user-1");

    expect(mockPrisma.providerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("creates a client profile with the given data", async () => {
    mockPrisma.clientProfile.create.mockResolvedValue({ id: "client-1" });

    await repository.createClientProfile({
      userId: "user-1",
      avatarUrl: "http://avatar.com/a.png",
      preferences: { theme: "dark" },
    });

    expect(mockPrisma.clientProfile.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        avatarUrl: "http://avatar.com/a.png",
        preferences: { theme: "dark" },
      },
    });
  });

  it("updates a client profile by user id", async () => {
    mockPrisma.clientProfile.update.mockResolvedValue({ id: "client-1" });

    await repository.updateClientProfile("user-1", {
      avatarUrl: "http://new.com/a.png",
      preferences: { theme: "dark" },
    });

    expect(mockPrisma.clientProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        avatarUrl: "http://new.com/a.png",
        preferences: { theme: "dark" },
      },
    });
  });

  it("creates a provider profile with the given data", async () => {
    mockPrisma.providerProfile.create.mockResolvedValue({ id: "provider-1" });

    await repository.createProviderProfile({
      userId: "user-1",
      avatarUrl: null,
      bio: "Test bio",
      hourlyRate: 50,
      skills: ["skill1"],
      portfolio: [],
      isAvailable: true,
    });

    expect(mockPrisma.providerProfile.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        avatarUrl: null,
        bio: "Test bio",
        hourlyRate: 50,
        skills: ["skill1"],
        portfolio: [],
        isAvailable: true,
      },
    });
  });

  it("updates a provider profile by user id", async () => {
    mockPrisma.providerProfile.update.mockResolvedValue({ id: "provider-1" });

    await repository.updateProviderProfile("user-1", {
      avatarUrl: "http://new.com/a.png",
      bio: "New bio",
      hourlyRate: 60,
      skills: ["skill1", "skill2"],
      portfolio: [],
      isAvailable: true,
    });

    expect(mockPrisma.providerProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        avatarUrl: "http://new.com/a.png",
        bio: "New bio",
        hourlyRate: 60,
        skills: ["skill1", "skill2"],
        portfolio: [],
        isAvailable: true,
      },
    });
  });

  it("updates the client avatar url", async () => {
    mockPrisma.clientProfile.update.mockResolvedValue({ id: "client-1" });

    await repository.updateClientAvatar("user-1", "http://new.com/a.png");

    expect(mockPrisma.clientProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { avatarUrl: "http://new.com/a.png" },
    });
  });

  it("updates the provider avatar url", async () => {
    mockPrisma.providerProfile.update.mockResolvedValue({ id: "provider-1" });

    await repository.updateProviderAvatar("user-1", "http://new.com/a.png");

    expect(mockPrisma.providerProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { avatarUrl: "http://new.com/a.png" },
    });
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
