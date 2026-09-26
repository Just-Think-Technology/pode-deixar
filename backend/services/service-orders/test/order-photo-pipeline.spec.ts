// OrderPhotoPipeline tests — deep module via interface, locality

import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { OrderPhotoPipeline } from "../src/service-orders/order-photo-pipeline.service";
import { PhotosRepository } from "../src/photos/photos.repository";
import { MinioService } from "@pode-deixar/storage";

// Minimal 1x1 png for sharp (valid image)
const ONE_PIXEL_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

describe("OrderPhotoPipeline", () => {
  const mockPhotosRepository: any = {
    uploadPhotos: jest.fn(async (_orderId: string, buffers: Buffer[], uploadFn: any) => {
      const uploaded = [];
      for (let i = 0; i < buffers.length; i++) {
        const fileName = `order/${i}.webp`;
        await uploadFn(fileName, buffers[i], "image/webp");
        uploaded.push({ id: `photo-${i}`, url: `/api/services/photos/photo-${i}/view` });
      }
      return uploaded;
    }),
  };

  const mockMinio: any = {
    uploadFile: jest.fn(async (fileName: string) => `http://minio/order-photos/${fileName}`),
  };

  let pipeline: OrderPhotoPipeline;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderPhotoPipeline,
        { provide: PhotosRepository, useValue: mockPhotosRepository },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();

    pipeline = module.get<OrderPhotoPipeline>(OrderPhotoPipeline);
    jest.clearAllMocks();
  });

  describe("via interface (OrderPhotoPipelinePort)", () => {
    it("exposes handleUpload/processFiles/uploadPhotos", () => {
      const viaInterface: any = pipeline as any;
      expect(typeof viaInterface.handleUpload).toBe("function");
      expect(typeof viaInterface.processFiles).toBe("function");
      expect(typeof viaInterface.uploadPhotos).toBe("function");
      expect(typeof viaInterface.convertToWebp).toBe("function");
    });

    it("throws when too many files", async () => {
      const files = Array.from({ length: 11 }, (_, i) => ({
        originalname: `photo-${i}.png`,
        buffer: ONE_PIXEL_PNG,
      })) as any;

      await expect(pipeline.handleUpload("order-1", files)).rejects.toThrow(BadRequestException);
    });

    it("converts valid png to webp", async () => {
      const files = [{ originalname: "photo.png", buffer: ONE_PIXEL_PNG }] as any;
      const buffers = await pipeline.processFiles(files);
      expect(buffers).toHaveLength(1);
      expect(buffers[0].length).toBeGreaterThan(0);
      // webp magic: RIFF....WEBP
      expect(buffers[0].slice(8, 12).toString()).toBe("WEBP");
    });

    it("rejects invalid image via validateImageFile or sharp", async () => {
      const files = [{ originalname: "photo.txt", buffer: Buffer.from("not an image") }] as any;
      await expect(pipeline.processFiles(files)).rejects.toThrow(BadRequestException);
    });

    it("uploads via repository and minio", async () => {
      const files = [{ originalname: "photo.png", buffer: ONE_PIXEL_PNG }] as any;
      const result = await pipeline.handleUpload("order-1", files);
      expect(result.uploadedCount).toBe(1);
      expect(result.photos).toHaveLength(1);
      expect(mockPhotosRepository.uploadPhotos).toHaveBeenCalled();
      expect(mockMinio.uploadFile).toHaveBeenCalled();
    });

    it("returns empty for null files", async () => {
      const result = await pipeline.handleUpload("order-1", null);
      expect(result.uploadedCount).toBe(0);
      expect(result.photos).toEqual([]);
    });

    it("returns empty buffers for null input", async () => {
      const buffers = await pipeline.processFiles(null);
      expect(buffers).toEqual([]);
    });
  });

  describe("when storage unavailable (locality: keeps error in pipeline)", () => {
    it("throws Serviço de fotos indisponível when deps missing", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [OrderPhotoPipeline],
      }).compile();
      const barePipeline = module.get<OrderPhotoPipeline>(OrderPhotoPipeline);
      const files = [{ originalname: "photo.png", buffer: ONE_PIXEL_PNG }] as any;
      await expect(barePipeline.handleUpload("order-1", files)).rejects.toThrow(
        "Serviço de fotos indisponível",
      );
    });
  });
});
