import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { PhotosRepository } from "../src/photos/photos.repository";

describe("PhotosRepository", () => {
  let repository: PhotosRepository;

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

  mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));

  const uploadFile = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PhotosRepository>(PhotosRepository);
    jest.clearAllMocks();
  });

  it("finds an order by id", async () => {
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({ id: "order-1" });

    await repository.findOrderById("order-1");

    expect(mockPrisma.serviceOrder.findUnique).toHaveBeenCalledWith({
      where: { id: "order-1" },
    });
  });

  it("uploads photos and creates rows in one transaction", async () => {
    mockPrisma.orderPhoto.count.mockResolvedValue(0);
    uploadFile.mockResolvedValue(
      "http://localhost:8080/api/storage/order-photos/order-1/uuid.webp",
    );
    mockPrisma.orderPhoto.create.mockResolvedValue({
      id: "photo-1",
      serviceOrderId: "order-1",
      url: "http://localhost:8080/api/storage/order-photos/order-1/uuid.webp",
      createdAt: new Date(),
    });

    const result = await repository.uploadPhotos(
      "order-1",
      [Buffer.from("webp-data")],
      uploadFile,
    );

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.orderPhoto.count).toHaveBeenCalledWith({
      where: { serviceOrderId: "order-1" },
    });
    expect(uploadFile).toHaveBeenCalledWith(
      expect.stringMatching(/^order-1\/.+\.webp$/),
      expect.any(Buffer),
      "image/webp",
    );
    expect(mockPrisma.orderPhoto.create).toHaveBeenCalledWith({
      data: {
        serviceOrderId: "order-1",
        url: "http://localhost:8080/api/storage/order-photos/order-1/uuid.webp",
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "photo-1",
      url: "/api/services/photos/photo-1/view",
      created_at: expect.any(Date),
    });
  });

  it("rejects uploads that exceed the 10-photo quota", async () => {
    mockPrisma.orderPhoto.count.mockResolvedValue(10);

    await expect(
      repository.uploadPhotos("order-1", [Buffer.from("webp-data")], uploadFile),
    ).rejects.toThrow(BadRequestException);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("finds a photo with its order", async () => {
    mockPrisma.orderPhoto.findUnique.mockResolvedValue({ id: "photo-1" });

    await repository.findPhotoWithOrderById("photo-1");

    expect(mockPrisma.orderPhoto.findUnique).toHaveBeenCalledWith({
      where: { id: "photo-1" },
      include: {
        serviceOrder: { select: { id: true, clientId: true } },
      },
    });
  });

  it("finds a viewer proposal for photo access", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue({ id: "proposal-1" });

    await repository.findProposalForViewer("order-1", "provider-1");

    expect(mockPrisma.proposal.findFirst).toHaveBeenCalledWith({
      where: { serviceOrderId: "order-1", providerId: "provider-1" },
      select: { id: true },
    });
  });
});
