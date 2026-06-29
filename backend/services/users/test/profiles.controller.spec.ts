import { Test, TestingModule } from "@nestjs/testing";
import { ProfilesController } from "../src/profiles/profiles.controller";
import { PublicProviderProfileController } from "../src/profiles/public-provider-profile.controller";
import { ProfilesService } from "../src/profiles/profiles.service";

describe("ProfilesController", () => {
  let controller: ProfilesController;
  let publicProfileController: PublicProviderProfileController;

  const mockProfilesService = {
    getProfile: jest.fn(),
    createClientProfile: jest.fn(),
    updateClientProfile: jest.fn(),
    createProviderProfile: jest.fn(),
    updateProviderProfile: jest.fn(),
    uploadAvatar: jest.fn(),
    getPublicProviderProfile: jest.fn(),
  };

  const mockRequest = (overrides = {}) => ({
    user: { sub: "user-1", email: "test@test.com", role: "CLIENT" },
    ip: "127.0.0.1",
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController, PublicProviderProfileController],
      providers: [
        { provide: ProfilesService, useValue: mockProfilesService },
      ],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
    publicProfileController = module.get<PublicProviderProfileController>(
      PublicProviderProfileController,
    );
    jest.clearAllMocks();
  });

  describe("getMyProfile", () => {
    it("should call service.getProfile with userId and role from token", async () => {
      const req = mockRequest();
      const expectedProfile = { id: "client-1", user: { complete_name: "Test" } };

      mockProfilesService.getProfile.mockResolvedValue(expectedProfile);

      const result = await controller.getMyProfile(req);

      expect(mockProfilesService.getProfile).toHaveBeenCalledWith(
        "user-1",
        "CLIENT",
      );
      expect(result).toEqual(expectedProfile);
    });
  });

  describe("createClientProfile", () => {
    it("should call service.createClientProfile with userId, dto and ip", async () => {
      const req = mockRequest();
      const dto = { avatarUrl: "http://avatar.com", preferences: { theme: "dark" } };
      const expectedProfile = { id: "client-1" };

      mockProfilesService.createClientProfile.mockResolvedValue(expectedProfile);

      const result = await controller.createClientProfile(req, dto as any);

      expect(mockProfilesService.createClientProfile).toHaveBeenCalledWith(
        "user-1",
        dto,
        "127.0.0.1",
      );
      expect(result).toEqual(expectedProfile);
    });
  });

  describe("updateClientProfile", () => {
    it("should call service.updateClientProfile with userId, dto and ip", async () => {
      const req = mockRequest();
      const dto = { avatarUrl: "http://new.com" };
      const expectedProfile = { id: "client-1" };

      mockProfilesService.updateClientProfile.mockResolvedValue(expectedProfile);

      const result = await controller.updateClientProfile(req, dto as any);

      expect(mockProfilesService.updateClientProfile).toHaveBeenCalledWith(
        "user-1",
        dto,
        "127.0.0.1",
      );
      expect(result).toEqual(expectedProfile);
    });
  });

  describe("createProviderProfile", () => {
    it("should call service.createProviderProfile with userId, dto and ip", async () => {
      const req = mockRequest({ user: { sub: "user-1", role: "PROVIDER" } });
      const dto = { bio: "Expert", hourlyRate: 50 };
      const expectedProfile = { id: "provider-1" };

      mockProfilesService.createProviderProfile.mockResolvedValue(expectedProfile);

      const result = await controller.createProviderProfile(req, dto as any);

      expect(mockProfilesService.createProviderProfile).toHaveBeenCalledWith(
        "user-1",
        dto,
        "127.0.0.1",
      );
      expect(result).toEqual(expectedProfile);
    });
  });

  describe("updateProviderProfile", () => {
    it("should call service.updateProviderProfile with userId, dto and ip", async () => {
      const req = mockRequest({ user: { sub: "user-1", role: "PROVIDER" } });
      const dto = { bio: "Updated bio" };
      const expectedProfile = { id: "provider-1" };

      mockProfilesService.updateProviderProfile.mockResolvedValue(expectedProfile);

      const result = await controller.updateProviderProfile(req, dto as any);

      expect(mockProfilesService.updateProviderProfile).toHaveBeenCalledWith(
        "user-1",
        dto,
        "127.0.0.1",
      );
      expect(result).toEqual(expectedProfile);
    });
  });

  describe("uploadAvatar", () => {
    it("should call service.uploadAvatar with userId, role, avatarUrl and ip", async () => {
      const req = mockRequest();
      const avatarUrl = "http://new-avatar.com";

      mockProfilesService.uploadAvatar.mockResolvedValue({
        avatar_url: avatarUrl,
      });

      const result = await controller.uploadAvatar(req, avatarUrl);

      expect(mockProfilesService.uploadAvatar).toHaveBeenCalledWith(
        "user-1",
        "CLIENT",
        avatarUrl,
        "127.0.0.1",
      );
      expect(result.avatar_url).toBe(avatarUrl);
    });
  });

  describe("PublicProviderProfileController - getPublicProviderProfile", () => {
    it("should call service.getPublicProviderProfile with providerProfileId", async () => {
      const expectedProfile = {
        id: "provider-1",
        user: { complete_name: "João" },
        services: [],
      };

      mockProfilesService.getPublicProviderProfile.mockResolvedValue(
        expectedProfile,
      );

      const result =
        await publicProfileController.getPublicProviderProfile("provider-1");

      expect(
        mockProfilesService.getPublicProviderProfile,
      ).toHaveBeenCalledWith("provider-1");
      expect(result).toEqual(expectedProfile);
    });
  });
});
