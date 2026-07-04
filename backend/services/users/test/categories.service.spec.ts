import { Test, TestingModule } from "@nestjs/testing";
import { CategoriesService } from "../src/categories/categories.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { UsersLoggerService } from "../src/shared/users-logger.service";
import { NotFoundException, ConflictException } from "@nestjs/common";

describe("CategoriesService", () => {
  let service: CategoriesService;

  const mockCategories = [
    { id: "cat-1", name: "Elétrica", slug: "eletrica", description: "Serviços de elétrica", icon: "zap", order: 1 },
    { id: "cat-2", name: "Hidráulica", slug: "hidraulica", description: "Serviços de hidráulica", icon: "droplets", order: 2 },
  ];

  const mockPrisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockLogger = {
    logInfo: jest.fn(),
    logWarn: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn(),
    logCategoryCreated: jest.fn(),
    logCategoryUpdated: jest.fn(),
    logCategoryDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all categories ordered by order", async () => {
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.findAll();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        orderBy: { order: "asc" },
        select: { id: true, name: true, slug: true, description: true, icon: true, order: true },
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Elétrica");
    });

    it("should return empty array when no categories exist", async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create a new category", async () => {
      const dto = { name: "Teste", slug: "teste", description: "Descrição", icon: "test", order: 5 };
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({ id: "new-id", ...dto });

      const result = await service.create(dto, "127.0.0.1");

      expect(mockPrisma.category.create).toHaveBeenCalledWith({ data: dto });
      expect(mockLogger.logCategoryCreated).toHaveBeenCalledWith("Teste", "127.0.0.1");
      expect(result.name).toBe("Teste");
    });

    it("should throw ConflictException when name already exists", async () => {
      const dto = { name: "Elétrica", slug: "teste" };
      mockPrisma.category.findFirst.mockResolvedValue(mockCategories[0]);

      await expect(service.create(dto, "127.0.0.1")).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when slug already exists", async () => {
      const dto = { name: "Teste", slug: "eletrica" };
      mockPrisma.category.findFirst.mockResolvedValue(mockCategories[0]);

      await expect(service.create(dto, "127.0.0.1")).rejects.toThrow(ConflictException);
    });
  });

  describe("update", () => {
    it("should update a category", async () => {
      const dto = { name: "Elétrica Atualizada" };
      mockPrisma.category.findUnique.mockResolvedValue(mockCategories[0]);
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.update.mockResolvedValue({ ...mockCategories[0], ...dto });

      const result = await service.update("cat-1", dto, "127.0.0.1");

      expect(mockPrisma.category.update).toHaveBeenCalledWith({ where: { id: "cat-1" }, data: dto });
      expect(mockLogger.logCategoryUpdated).toHaveBeenCalled();
      expect(result.name).toBe("Elétrica Atualizada");
    });

    it("should throw NotFoundException when category not found", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update("invalid-id", { name: "Teste" }, "ip")).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when new name conflicts with existing", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategories[0]);
      mockPrisma.category.findFirst.mockResolvedValue(mockCategories[1]);

      await expect(service.update("cat-1", { name: "Hidráulica" }, "ip")).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("should delete a category", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategories[0]);
      mockPrisma.category.delete.mockResolvedValue(mockCategories[0]);

      await service.remove("cat-1", "127.0.0.1");

      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
      expect(mockLogger.logCategoryDeleted).toHaveBeenCalledWith("Elétrica", "127.0.0.1");
    });

    it("should throw NotFoundException when category not found", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove("invalid-id", "ip")).rejects.toThrow(NotFoundException);
    });
  });
});
