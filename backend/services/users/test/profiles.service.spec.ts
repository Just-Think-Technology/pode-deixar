import { Test, TestingModule } from "@nestjs/testing";
import { ProfilesService } from "../src/profiles/profiles.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { MinioService } from "../src/storage/minio.service";
import { UsersLoggerService } from "../src/shared/users-logger.service";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "crypto";

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "mocked-uuid"),
}));

function mockFile(): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: "avatar.png",
    encoding: "7bit",
    mimetype: "image/png",
    buffer: Buffer.from("fake-content"),
    size: 1024,
    stream: null as any,
    destination: "",
    filename: "",
    path: "",
  };
}

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

  const mockMinio = {
    avatarBucket: "avatars",
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    extractFileName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
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
    const expectedUrl =
      "http://localhost:8080/api/storage/avatars/mocked-uuid.png";

    it("should upload client avatar to MinIO and save URL", async () => {
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
        avatarUrl: expectedUrl,
      };

      mockMinio.uploadFile.mockResolvedValue(expectedUrl);
      mockMinio.extractFileName.mockReturnValue("old-uuid.png");
      mockMinio.deleteFile.mockResolvedValue(undefined);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.findUnique.mockResolvedValue(existing);
      mockPrisma.clientProfile.update.mockResolvedValue(updated);

      const result = await service.uploadAvatar(
        "user-1",
        "CLIENT",
        mockFile(),
        "127.0.0.1",
      );

      expect(mockMinio.uploadFile).toHaveBeenCalledWith(
        "mocked-uuid.png",
        Buffer.from("fake-content"),
        "image/png",
        mockMinio.avatarBucket,
      );
      expect(mockMinio.deleteFile).toHaveBeenCalledWith(
        "old-uuid.png",
        mockMinio.avatarBucket,
      );
      expect(result.avatar_url).toBe(expectedUrl);
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
        avatarUrl: expectedUrl,
      };

      mockMinio.uploadFile.mockResolvedValue(expectedUrl);
      mockMinio.extractFileName.mockReturnValue("old-uuid.png");
      mockMinio.deleteFile.mockResolvedValue(undefined);
      mockPrisma.user.findUnique.mockResolvedValue(mockProviderUser);
      mockPrisma.providerProfile.findUnique.mockResolvedValue(existing);
      mockPrisma.providerProfile.update.mockResolvedValue(updated);

      const result = await service.uploadAvatar(
        "user-1",
        "PROVIDER",
        mockFile(),
        "127.0.0.1",
      );

      expect(mockMinio.uploadFile).toHaveBeenCalled();
      expect(result.avatar_url).toBe(expectedUrl);
      expect(mockLogger.logAvatarUploaded).toHaveBeenCalledWith(
        "user-1",
        "PROVIDER",
        "127.0.0.1",
      );
    });

    it("should delete old avatar from MinIO when uploading new one", async () => {
      const existing = {
        id: "client-1",
        userId: "user-1",
        avatarUrl: "http://localhost:8080/api/storage/avatars/old-uuid.png",
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = {
        ...existing,
        avatarUrl: expectedUrl,
      };

      mockMinio.uploadFile.mockResolvedValue(expectedUrl);
      mockMinio.extractFileName.mockReturnValue("old-uuid.png");
      mockMinio.deleteFile.mockResolvedValue(undefined);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.findUnique.mockResolvedValue(existing);
      mockPrisma.clientProfile.update.mockResolvedValue(updated);

      await service.uploadAvatar("user-1", "CLIENT", mockFile(), "127.0.0.1");

      expect(mockMinio.extractFileName).toHaveBeenCalledWith(
        "http://localhost:8080/api/storage/avatars/old-uuid.png",
        mockMinio.avatarBucket,
      );
      expect(mockMinio.deleteFile).toHaveBeenCalledWith(
        "old-uuid.png",
        mockMinio.avatarBucket,
      );
    });

    it("should not delete old avatar if profile had no avatar", async () => {
      const existing = {
        id: "client-1",
        userId: "user-1",
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = {
        ...existing,
        avatarUrl: expectedUrl,
      };

      mockMinio.uploadFile.mockResolvedValue(expectedUrl);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.findUnique.mockResolvedValue(existing);
      mockPrisma.clientProfile.update.mockResolvedValue(updated);

      await service.uploadAvatar("user-1", "CLIENT", mockFile(), "127.0.0.1");

      expect(mockMinio.deleteFile).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadAvatar("user-1", "CLIENT", mockFile(), "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadAvatar("user-1", "CLIENT", mockFile(), "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getPublicProviderProfile", () => {
    const mockProfile = {
      id: "provider-1",
      userId: "user-1",
      avatarUrl: null,
      bio: "Eletricista experiente",
      hourlyRate: 50,
      skills: ["ELETRICA"],
      portfolio: [],
      rating: 4.5,
      totalReviews: 10,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: "user-1",
        completeName: "João Eletricista",
        email: "joao@email.com",
        phone: "11999999999",
        postalCode: "01234-567",
      },
      services: [
        {
          id: "service-1",
          providerProfileId: "provider-1",
          title: "Instalação de chuveiro",
          description: "Descrição",
          fixedPrice: 150,
          categoryId: "cat-eletrica",
          category: { id: "cat-eletrica", name: "Elétrica", slug: "eletrica" },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    it("should return provider profile with services", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getPublicProviderProfile("provider-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("provider-1");
      expect(result.user.complete_name).toBe("João Eletricista");
      expect(result.services).toHaveLength(1);
      expect(result.services[0].title).toBe("Instalação de chuveiro");
      expect(result.services[0].fixed_price).toBe(150);
      expect(mockPrisma.providerProfile.findUnique).toHaveBeenCalledWith({
        where: { id: "provider-1" },
        include: {
          user: {
            select: {
              id: true,
              completeName: true,
              email: true,
              phone: true,
              postalCode: true,
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

    it("should throw NotFoundException when provider profile not found", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getPublicProviderProfile("invalid-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
