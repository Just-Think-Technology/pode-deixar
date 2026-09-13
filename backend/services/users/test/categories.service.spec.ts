import { Test, TestingModule } from "@nestjs/testing";
import { CategoriesService } from "../src/categories/categories.service";
import { CategoriesRepository } from "../src/categories/categories.repository";
import { UsersLoggerService } from "../src/shared/users-logger.service";
import { NotFoundException, ConflictException } from "@nestjs/common";

describe("CategoriesService", () => {
  let service: CategoriesService;

  const mockCategories = [
    { id: "cat-1", name: "Elétrica", slug: "eletrica", description: "Serviços de elétrica", icon: "zap", order: 1 },
    { id: "cat-2", name: "Hidráulica", slug: "hidraulica", description: "Serviços de hidráulica", icon: "droplets", order: 2 },
  ];

  const mockRepository = {
    findAllCategories: jest.fn(),
    findConflictingCategory: jest.fn(),
    createCategory: jest.fn(),
    findCategoryById: jest.fn(),
    findCategoryByNameExcludingId: jest.fn(),
    findCategoryBySlugExcludingId: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
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
        { provide: CategoriesRepository, useValue: mockRepository },
        { provide: UsersLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all categories ordered by order", async () => {
      mockRepository.findAllCategories.mockResolvedValue(mockCategories);

      const result = await service.findAll();

      expect(mockRepository.findAllCategories).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Elétrica");
    });

    it("should return empty array when no categories exist", async () => {
      mockRepository.findAllCategories.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create a new category", async () => {
      const dto = { name: "Teste", slug: "teste", description: "Descrição", icon: "test", order: 5 };
      mockRepository.findConflictingCategory.mockResolvedValue(null);
      mockRepository.createCategory.mockResolvedValue({ id: "new-id", ...dto });

      const result = await service.create(dto, "127.0.0.1");

      expect(mockRepository.createCategory).toHaveBeenCalledWith(dto);
      expect(mockLogger.logCategoryCreated).toHaveBeenCalledWith("Teste", "127.0.0.1");
      expect(result.name).toBe("Teste");
    });

    it("should throw ConflictException when name already exists", async () => {
      const dto = { name: "Elétrica", slug: "teste" };
      mockRepository.findConflictingCategory.mockResolvedValue(mockCategories[0]);

      await expect(service.create(dto, "127.0.0.1")).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when slug already exists", async () => {
      const dto = { name: "Teste", slug: "eletrica" };
      mockRepository.findConflictingCategory.mockResolvedValue(mockCategories[0]);

      await expect(service.create(dto, "127.0.0.1")).rejects.toThrow(ConflictException);
    });
  });

  describe("update", () => {
    it("should update a category", async () => {
      const dto = { name: "Elétrica Atualizada" };
      mockRepository.findCategoryById.mockResolvedValue(mockCategories[0]);
      mockRepository.findCategoryByNameExcludingId.mockResolvedValue(null);
      mockRepository.updateCategory.mockResolvedValue({ ...mockCategories[0], ...dto });

      const result = await service.update("cat-1", dto, "127.0.0.1");

      expect(mockRepository.updateCategory).toHaveBeenCalledWith("cat-1", dto);
      expect(mockLogger.logCategoryUpdated).toHaveBeenCalled();
      expect(result.name).toBe("Elétrica Atualizada");
    });

    it("should throw NotFoundException when category not found", async () => {
      mockRepository.findCategoryById.mockResolvedValue(null);

      await expect(service.update("invalid-id", { name: "Teste" }, "ip")).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when new name conflicts with existing", async () => {
      mockRepository.findCategoryById.mockResolvedValue(mockCategories[0]);
      mockRepository.findCategoryByNameExcludingId.mockResolvedValue(mockCategories[1]);

      await expect(service.update("cat-1", { name: "Hidráulica" }, "ip")).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("should delete a category", async () => {
      mockRepository.findCategoryById.mockResolvedValue(mockCategories[0]);
      mockRepository.deleteCategory.mockResolvedValue(mockCategories[0]);

      await service.remove("cat-1", "127.0.0.1");

      expect(mockRepository.deleteCategory).toHaveBeenCalledWith("cat-1");
      expect(mockLogger.logCategoryDeleted).toHaveBeenCalledWith("Elétrica", "127.0.0.1");
    });

    it("should throw NotFoundException when category not found", async () => {
      mockRepository.findCategoryById.mockResolvedValue(null);

      await expect(service.remove("invalid-id", "ip")).rejects.toThrow(NotFoundException);
    });
  });
});
