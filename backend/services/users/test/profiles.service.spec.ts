import { Test, TestingModule } from "@nestjs/testing";
import { ProfilesService } from "../src/profiles/profiles.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { UsersLoggerService } from "../src/shared/users-logger.service";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";

describe("ProfilesService", () => {
  let service: ProfilesService;

  const mockPrisma = {
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
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockLogger = {
    logProfileCreated: jest.fn(),
    logProfileUpdated: jest.fn(),
    logProfileFetched: jest.fn(),
    logAvatarUploaded: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should return client profile when role is CLIENT", async () => {
      const mockProfile = {
        id: "client-1",
        userId: "user-1",
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: "user-1",
          completeName: "Test User",
          email: "test@test.com",
          phone: "123",
          postalCode: "12345",
          role: "CLIENT",
        },
      };
      mockPrisma.clientProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile("user-1", "CLIENT");

      expect(result).toBeDefined();
      expect(result.id).toBe("client-1");
      expect(mockLogger.logProfileFetched).toHaveBeenCalledWith(
        "user-1",
        "CLIENT",
      );
    });

    it("should throw NotFoundException when client profile not found", async () => {
      mockPrisma.clientProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile("user-1", "CLIENT")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return provider profile when role is PROVIDER", async () => {
      const mockProfile = {
        id: "provider-1",
        userId: "user-1",
        avatarUrl: null,
        bio: "Test bio",
        hourlyRate: 50,
        skills: ["skill1"],
        portfolio: [],
        rating: 0,
        totalReviews: 0,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: "user-1",
          completeName: "Test Provider",
          email: "provider@test.com",
          phone: "123",
          postalCode: "12345",
          role: "PROVIDER",
        },
      };
      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile("user-1", "PROVIDER");

      expect(result).toBeDefined();
      expect(result.id).toBe("provider-1");
    });
  });

  describe("createClientProfile", () => {
    it("should create client profile", async () => {
      const mockUser = { id: "user-1", role: "CLIENT" };
      const mockProfile = {
        id: "client-1",
        userId: "user-1",
        avatarUrl: "http://avatar.com/img.png",
        preferences: { theme: "dark" },
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      };
      mockPrisma.clientProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.create.mockResolvedValue(mockProfile);

      const result = await service.createClientProfile(
        "user-1",
        {
          avatarUrl: "http://avatar.com/img.png",
          preferences: { theme: "dark" },
        },
        "127.0.0.1",
      );

      expect(result).toBeDefined();
      expect(result.avatar_url).toBe("http://avatar.com/img.png");
      expect(mockLogger.logProfileCreated).toHaveBeenCalledWith(
        "user-1",
        "CLIENT",
        "127.0.0.1",
      );
    });

    it("should throw ConflictException if profile already exists", async () => {
      mockPrisma.clientProfile.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.createClientProfile("user-1", {}, "127.0.0.1"),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException if user is not a client", async () => {
      mockPrisma.clientProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        role: "PROVIDER",
      });

      await expect(
        service.createClientProfile("user-1", {}, "127.0.0.1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("createProviderProfile", () => {
    it("should create provider profile", async () => {
      const mockUser = { id: "user-1", role: "PROVIDER" };
      const mockProfile = {
        id: "provider-1",
        userId: "user-1",
        avatarUrl: null,
        bio: "Test bio",
        hourlyRate: 50,
        skills: ["skill1"],
        portfolio: [],
        isAvailable: true,
        rating: 0,
        totalReviews: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      };
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.providerProfile.create.mockResolvedValue(mockProfile);

      const result = await service.createProviderProfile(
        "user-1",
        { bio: "Test bio", hourlyRate: 50, skills: ["skill1"] },
        "127.0.0.1",
      );

      expect(result).toBeDefined();
      expect(result.bio).toBe("Test bio");
      expect(mockLogger.logProfileCreated).toHaveBeenCalledWith(
        "user-1",
        "PROVIDER",
        "127.0.0.1",
      );
    });
  });
});
