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

  const mockUser = {
    id: "user-1",
    completeName: "Test User",
    email: "test@test.com",
    phone: "123",
    postalCode: "12345",
    role: "CLIENT",
  };

  const mockProviderUser = {
    id: "user-1",
    completeName: "Test Provider",
    email: "provider@test.com",
    phone: "123",
    postalCode: "12345",
    role: "PROVIDER",
  };

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
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile("user-1", "CLIENT");

      expect(result).toBeDefined();
      expect(result.id).toBe("client-1");
      expect(result.user.complete_name).toBe("Test User");
      expect(mockLogger.logProfileFetched).toHaveBeenCalledWith(
        "user-1",
        "CLIENT",
      );
    });

    it("should throw NotFoundException when client profile not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
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
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockProviderUser);
      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile("user-1", "PROVIDER");

      expect(result).toBeDefined();
      expect(result.id).toBe("provider-1");
      expect(result.user.role).toBe("PROVIDER");
    });

    it("should throw BadRequestException when role is invalid", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.getProfile("user-1", "ADMIN")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile("user-1", "CLIENT")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateClientProfile", () => {
    it("should update client profile", async () => {
      const existing = {
        id: "client-1",
        userId: "user-1",
        avatarUrl: "http://old.com/avatar.png",
        preferences: { theme: "light" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = {
        ...existing,
        avatarUrl: "http://new.com/avatar.png",
        preferences: { theme: "dark" },
      };

      mockPrisma.clientProfile.findUnique.mockResolvedValue(existing);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.update.mockResolvedValue(updated);

      const result = await service.updateClientProfile(
        "user-1",
        {
          avatarUrl: "http://new.com/avatar.png",
          preferences: { theme: "dark" },
        },
        "127.0.0.1",
      );

      expect(result.avatar_url).toBe("http://new.com/avatar.png");
      expect(result.preferences).toEqual({ theme: "dark" });
      expect(mockLogger.logProfileUpdated).toHaveBeenCalledWith(
        "user-1",
        "CLIENT",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when client profile not found", async () => {
      mockPrisma.clientProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateClientProfile("user-1", {}, "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("createProviderProfile", () => {
    it("should create provider profile", async () => {
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
      };
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockProviderUser);
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

    it("should throw ConflictException if profile already exists", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue({
        id: "existing",
      });

      await expect(
        service.createProviderProfile("user-1", {}, "127.0.0.1"),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException if user is not a provider", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.createProviderProfile("user-1", {}, "127.0.0.1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateProviderProfile", () => {
    it("should update provider profile", async () => {
      const existing = {
        id: "provider-1",
        userId: "user-1",
        avatarUrl: "http://old.com/avatar.png",
        bio: "Old bio",
        hourlyRate: 40,
        skills: ["skill1"],
        portfolio: [],
        isAvailable: true,
        rating: 0,
        totalReviews: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = {
        ...existing,
        bio: "New bio",
        hourlyRate: 60,
        skills: ["skill1", "skill2"],
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(existing);
      mockPrisma.user.findUnique.mockResolvedValue(mockProviderUser);
      mockPrisma.providerProfile.update.mockResolvedValue(updated);

      const result = await service.updateProviderProfile(
        "user-1",
        {
          bio: "New bio",
          hourlyRate: 60,
          skills: ["skill1", "skill2"],
        },
        "127.0.0.1",
      );

      expect(result.bio).toBe("New bio");
      expect(result.hourly_rate).toBe(60);
      expect(result.skills).toEqual(["skill1", "skill2"]);
      expect(mockLogger.logProfileUpdated).toHaveBeenCalledWith(
        "user-1",
        "PROVIDER",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when provider profile not found", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProviderProfile("user-1", {}, "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("uploadAvatar", () => {
    it("should upload client avatar", async () => {
      const existing = {
        id: "client-1",
        userId: "user-1",
        avatarUrl: "http://old.com/avatar.png",
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = {
        ...existing,
        avatarUrl: "http://new.com/avatar.png",
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.findUnique.mockResolvedValue(existing);
      mockPrisma.clientProfile.update.mockResolvedValue(updated);

      const result = await service.uploadAvatar(
        "user-1",
        "CLIENT",
        "http://new.com/avatar.png",
        "127.0.0.1",
      );

      expect(result.avatar_url).toBe("http://new.com/avatar.png");
      expect(mockLogger.logAvatarUploaded).toHaveBeenCalledWith(
        "user-1",
        "CLIENT",
        "127.0.0.1",
      );
    });

    it("should upload provider avatar", async () => {
      const existing = {
        id: "provider-1",
        userId: "user-1",
        avatarUrl: "http://old.com/avatar.png",
        bio: "Provider bio",
        hourlyRate: 45,
        skills: ["skill1"],
        portfolio: [],
        rating: 0,
        totalReviews: 0,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = {
        ...existing,
        avatarUrl: "http://new.com/avatar.png",
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockProviderUser);
      mockPrisma.providerProfile.findUnique.mockResolvedValue(existing);
      mockPrisma.providerProfile.update.mockResolvedValue(updated);

      const result = await service.uploadAvatar(
        "user-1",
        "PROVIDER",
        "http://new.com/avatar.png",
        "127.0.0.1",
      );

      expect(result.avatar_url).toBe("http://new.com/avatar.png");
      expect(mockLogger.logAvatarUploaded).toHaveBeenCalledWith(
        "user-1",
        "PROVIDER",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when profile does not exist for uploadAvatar", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadAvatar(
          "user-1",
          "CLIENT",
          "http://new.com/avatar.png",
          "127.0.0.1",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
