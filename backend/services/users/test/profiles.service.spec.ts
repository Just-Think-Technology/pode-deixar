import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ProfilesService } from "../src/profiles/profiles.service";
import { ProfilesRepository } from "../src/profiles/profiles.repository";
import { MinioService } from "@pode-deixar/storage";
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
    // Real PNG magic bytes — the service now validates magic bytes and
    // rejects fake content ("fake-content").
    buffer: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]),
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

  const mockRepository = {
    findUserById: jest.fn(),
    findClientProfileByUserId: jest.fn(),
    findProviderProfileByUserId: jest.fn(),
    createClientProfile: jest.fn(),
    updateClientProfile: jest.fn(),
    createProviderProfile: jest.fn(),
    updateProviderProfile: jest.fn(),
    updateClientAvatar: jest.fn(),
    updateProviderAvatar: jest.fn(),
    findPublicProviderProfile: jest.fn(),
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
        { provide: ProfilesRepository, useValue: mockRepository },
        { provide: MinioService, useValue: mockMinio },
        { provide: UsersLoggerService, useValue: mockLogger },
        // ProfilesService resolves its avatar bucket from config.
        { provide: ConfigService, useValue: { get: () => undefined } },
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
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findClientProfileByUserId.mockResolvedValue(mockProfile);

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
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findClientProfileByUserId.mockResolvedValue(null);

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
      mockRepository.findUserById.mockResolvedValue(mockProviderUser);
      mockRepository.findProviderProfileByUserId.mockResolvedValue(mockProfile);

      const result = await service.getProfile("user-1", "PROVIDER");

      expect(result).toBeDefined();
      expect(result.id).toBe("provider-1");
      expect(result.user.role).toBe("PROVIDER");
    });

    it("should throw BadRequestException when role is invalid", async () => {
      mockRepository.findUserById.mockResolvedValue(mockUser);

      await expect(service.getProfile("user-1", "ADMIN")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when user not found", async () => {
      mockRepository.findUserById.mockResolvedValue(null);

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

      mockRepository.findClientProfileByUserId.mockResolvedValue(existing);
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.updateClientProfile.mockResolvedValue(updated);

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
      mockRepository.findClientProfileByUserId.mockResolvedValue(null);

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
      mockRepository.findProviderProfileByUserId.mockResolvedValue(null);
      mockRepository.findUserById.mockResolvedValue(mockProviderUser);
      mockRepository.createProviderProfile.mockResolvedValue(mockProfile);

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
      mockRepository.findProviderProfileByUserId.mockResolvedValue({
        id: "existing",
      });

      await expect(
        service.createProviderProfile("user-1", {}, "127.0.0.1"),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException if user is not a provider", async () => {
      mockRepository.findProviderProfileByUserId.mockResolvedValue(null);
      mockRepository.findUserById.mockResolvedValue(mockUser);

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

      mockRepository.findProviderProfileByUserId.mockResolvedValue(existing);
      mockRepository.findUserById.mockResolvedValue(mockProviderUser);
      mockRepository.updateProviderProfile.mockResolvedValue(updated);

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
      mockRepository.findProviderProfileByUserId.mockResolvedValue(null);

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
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findClientProfileByUserId.mockResolvedValue(existing);
      mockRepository.updateClientAvatar.mockResolvedValue(updated);

      const result = await service.uploadAvatar(
        "user-1",
        "CLIENT",
        mockFile(),
        "127.0.0.1",
      );

      expect(mockMinio.uploadFile).toHaveBeenCalledWith(
        "mocked-uuid.png",
        mockFile().buffer,
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
      mockRepository.findUserById.mockResolvedValue(mockProviderUser);
      mockRepository.findProviderProfileByUserId.mockResolvedValue(existing);
      mockRepository.updateProviderAvatar.mockResolvedValue(updated);

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
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findClientProfileByUserId.mockResolvedValue(existing);
      mockRepository.updateClientAvatar.mockResolvedValue(updated);

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
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findClientProfileByUserId.mockResolvedValue(existing);
      mockRepository.updateClientAvatar.mockResolvedValue(updated);

      await service.uploadAvatar("user-1", "CLIENT", mockFile(), "127.0.0.1");

      expect(mockMinio.deleteFile).not.toHaveBeenCalled();
    });

    // Covers the new magic-bytes validation — clients can forge
    // mimetype/extension, so the real content is verified.
    it("should throw BadRequestException when file content is not an image", async () => {
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findClientProfileByUserId.mockResolvedValue({
        id: "client-1",
        userId: "user-1",
        avatarUrl: null,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const falso = mockFile();
      falso.buffer = Buffer.from("isto-nao-e-uma-imagem");

      await expect(
        service.uploadAvatar("user-1", "CLIENT", falso, "127.0.0.1"),
      ).rejects.toThrow(BadRequestException);
      expect(mockMinio.uploadFile).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      mockRepository.findUserById.mockResolvedValue(mockUser);
      mockRepository.findClientProfileByUserId.mockResolvedValue(null);

      await expect(
        service.uploadAvatar("user-1", "CLIENT", mockFile(), "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockRepository.findUserById.mockResolvedValue(null);

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
      mockRepository.findPublicProviderProfile.mockResolvedValue(mockProfile);

      const result = await service.getPublicProviderProfile("provider-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("provider-1");
      expect(result.user.complete_name).toBe("João Eletricista");
      // Public profiles must not expose PII.
      expect(result.user).not.toHaveProperty("email");
      expect(result.user).not.toHaveProperty("phone");
      expect(result.user).not.toHaveProperty("postal_code");
      expect(result.services).toHaveLength(1);
      expect(result.services[0].title).toBe("Instalação de chuveiro");
      expect(result.services[0].fixed_price).toBe(150);
      expect(mockRepository.findPublicProviderProfile).toHaveBeenCalledWith(
        "provider-1",
      );
    });

    it("should throw NotFoundException when provider profile not found", async () => {
      mockRepository.findPublicProviderProfile.mockResolvedValue(null);

      await expect(
        service.getPublicProviderProfile("invalid-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
