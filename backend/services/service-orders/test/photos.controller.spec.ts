import { Test, TestingModule } from "@nestjs/testing";
import { PhotosController } from "../src/photos/photos.controller";
import { PhotosService } from "../src/photos/photos.service";
import { BadRequestException } from "@nestjs/common";

describe("PhotosController", () => {
  let controller: PhotosController;

  const mockPhotosService = {
    upload: jest.fn(),
  };

  const mockRequest = (overrides = {}) => ({
    user: { sub: "client-1", email: "client@test.com", role: "CLIENT" },
    ip: "127.0.0.1",
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhotosController],
      providers: [
        { provide: PhotosService, useValue: mockPhotosService },
      ],
    }).compile();

    controller = module.get<PhotosController>(PhotosController);
    jest.clearAllMocks();
  });

  describe("upload", () => {
    it("should call service.upload with orderId, userId and files", async () => {
      const req = mockRequest();
      const files = [{ buffer: Buffer.from("test"), originalname: "foto.jpg" }] as any;
      const expectedResult = [{ id: "photo-1", url: "http://..." }];

      mockPhotosService.upload.mockResolvedValue(expectedResult);

      const result = await controller.upload(req, "order-1", files);

      expect(mockPhotosService.upload).toHaveBeenCalledWith(
        "order-1",
        "client-1",
        files,
      );
      expect(result).toEqual(expectedResult);
    });

    it("should throw BadRequestException when no files provided", async () => {
      const req = mockRequest();

      await expect(controller.upload(req, "order-1", null as any)).rejects.toThrow(
        BadRequestException,
      );

      await expect(controller.upload(req, "order-1", [] as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
