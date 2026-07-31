import { Test, TestingModule } from "@nestjs/testing";
import { PhotosService } from "../src/photos/photos.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { MinioService } from "../src/storage/minio.service";
import { BadRequestException } from "@nestjs/common";

jest.mock("sharp", () => {
  return jest.fn().mockImplementation(() => ({
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("webp-data")),
  }));
});

describe("PhotosService", () => {
  let service: PhotosService;

  const mockOrder = {
    id: "order-1",
    clientId: "client-1",
    providerId: null,
  };

  const mockFile = {
    buffer: Buffer.from("fake-image-data"),
    originalname: "foto.jpg",
    mimetype: "image/jpeg",
    size: 1024,
  } as Express.Multer.File;

  const mockPrisma = {
    serviceOrder: {
      findUnique: jest.fn(),
    },
    orderPhoto: {
      count: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockMinio = {
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
    jest.clearAllMocks();
  });

  describe("upload", () => {
    it("should upload photos and return them", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderPhoto.count.mockResolvedValue(0);
      mockMinio.uploadFile.mockResolvedValue(
        "http://localhost:8080/api/storage/order-photos/order-1/uuid.webp",
      );
      mockPrisma.orderPhoto.create.mockResolvedValue({
        id: "photo-1",
        serviceOrderId: "order-1",
        url: "http://localhost:8080/api/storage/order-photos/order-1/uuid.webp",
        createdAt: new Date(),
      });

      const result = await service.upload("order-1", "client-1", [mockFile]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("photo-1");
      expect(mockMinio.uploadFile).toHaveBeenCalled();
    });

    it("should throw BadRequestException when order not found", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.upload("invalid-id", "client-1", [mockFile]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when client is not the owner", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        clientId: "other-client",
      });

      await expect(
        service.upload("order-1", "client-1", [mockFile]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when no files provided", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.upload("order-1", "client-1", []),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when exceeding max total photos", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderPhoto.count.mockResolvedValue(10);

      await expect(
        service.upload("order-1", "client-1", [mockFile]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when sending more than 10 files", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      const manyFiles = Array(11).fill(mockFile);

      await expect(
        service.upload("order-1", "client-1", manyFiles),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
