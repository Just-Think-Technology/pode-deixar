import { Test, TestingModule } from "@nestjs/testing";
import { PhotosService } from "../src/photos/photos.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { MinioService } from "../src/storage/minio.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

jest.mock("sharp", () => {
  return jest.fn().mockImplementation(() => ({
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("webp-data")),
  }));
});

// Valid 1x1 PNG (passes the service's magic-bytes check)
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("PhotosService", () => {
  let service: PhotosService;

  const mockOrder = {
    id: "order-1",
    clientId: "client-1",
    providerId: null,
    status: "OPEN",
  };

  const mockFile = {
    buffer: PNG_1X1,
    originalname: "foto.png",
    mimetype: "image/png",
    size: 1024,
  } as Express.Multer.File;

  const mockPrisma = {
    serviceOrder: {
      findUnique: jest.fn(),
    },
    orderPhoto: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    proposal: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMinio = {
    uploadFile: jest.fn(),
    generateTemporaryUrl: jest.fn(),
    extractFileName: jest.fn(),
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
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn(mockPrisma),
      );
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

    it("should throw NotFoundException when order not found", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.upload("invalid-id", "client-1", [mockFile]),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when client is not the owner", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        clientId: "other-client",
      });

      await expect(
        service.upload("order-1", "client-1", [mockFile]),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when no files provided", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.upload("order-1", "client-1", []),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when exceeding max total photos", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn(mockPrisma),
      );
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

    it("should throw BadRequestException when order is not OPEN", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        status: "IN_PROGRESS",
      });

      await expect(
        service.upload("order-1", "client-1", [mockFile]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when file content mismatches mimetype", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      const forged = {
        buffer: Buffer.from("nao-e-uma-imagem-valida-1234567890"),
        originalname: "falso.png",
        mimetype: "image/png",
        size: 32,
      } as Express.Multer.File;

      await expect(
        service.upload("order-1", "client-1", [forged]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getViewUrl", () => {
    const mockFoto = {
      id: "photo-1",
      serviceOrderId: "order-1",
      url: "http://localhost:8080/api/storage/order-photos/order-1/uuid.webp",
      serviceOrder: { id: "order-1", clientId: "client-1" },
    };

    it("should return presigned url for the order owner", async () => {
      mockPrisma.orderPhoto.findUnique.mockResolvedValue(mockFoto);
      mockMinio.extractFileName.mockReturnValue("order-1/uuid.webp");
      mockMinio.generateTemporaryUrl.mockResolvedValue("https://minio/presigned");

      const result = await service.getViewUrl(
        "photo-1",
        "client-1",
        "CLIENT",
      );

      expect(result).toEqual({ url: "https://minio/presigned" });
      expect(mockMinio.generateTemporaryUrl).toHaveBeenCalledWith(
        "order-1/uuid.webp",
      );
    });

    it("should return presigned url for provider with proposal on the order", async () => {
      mockPrisma.orderPhoto.findUnique.mockResolvedValue({
        ...mockFoto,
        serviceOrder: { id: "order-1", clientId: "other-client" },
      });
      mockPrisma.proposal.findFirst.mockResolvedValue({ id: "proposal-1" });
      mockMinio.extractFileName.mockReturnValue("order-1/uuid.webp");
      mockMinio.generateTemporaryUrl.mockResolvedValue("https://minio/presigned");

      const result = await service.getViewUrl(
        "photo-1",
        "provider-1",
        "PROVIDER",
      );

      expect(result).toEqual({ url: "https://minio/presigned" });
    });

    it("should throw NotFoundException when photo not found", async () => {
      mockPrisma.orderPhoto.findUnique.mockResolvedValue(null);

      await expect(
        service.getViewUrl("invalid-id", "client-1", "CLIENT"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for unrelated provider", async () => {
      mockPrisma.orderPhoto.findUnique.mockResolvedValue({
        ...mockFoto,
        serviceOrder: { id: "order-1", clientId: "other-client" },
      });
      mockPrisma.proposal.findFirst.mockResolvedValue(null);

      await expect(
        service.getViewUrl("photo-1", "provider-9", "PROVIDER"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
