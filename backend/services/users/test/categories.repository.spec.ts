import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { CategoriesRepository } from "../src/categories/categories.repository";

describe("CategoriesRepository", () => {
  let repository: CategoriesRepository;

  const mockPrisma = {
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CategoriesRepository>(CategoriesRepository);
    jest.clearAllMocks();
  });

  it("lists all categories ordered by usage with the public select", async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);

    await repository.findAllCategories();

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
      orderBy: { serviceOrders: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        order: true,
      },
    });
  });

  it("finds a conflicting category by name or slug", async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await repository.findConflictingCategory("Elétrica", "eletrica");

    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ name: "Elétrica" }, { slug: "eletrica" }] },
    });
  });

  it("creates a category with the given data", async () => {
    mockPrisma.category.create.mockResolvedValue({ id: "new-id" });
    const dto = {
      name: "Teste",
      slug: "teste",
      description: "Descrição",
      icon: "test",
      order: 5,
    };

    await repository.createCategory(dto);

    expect(mockPrisma.category.create).toHaveBeenCalledWith({ data: dto });
  });

  it("finds a category by id", async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1" });

    await repository.findCategoryById("cat-1");

    expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
      where: { id: "cat-1" },
    });
  });

  it("finds a name conflict excluding the current id", async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await repository.findCategoryByNameExcludingId("Hidráulica", "cat-1");

    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
      where: { name: "Hidráulica", id: { not: "cat-1" } },
    });
  });

  it("finds a slug conflict excluding the current id", async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await repository.findCategoryBySlugExcludingId("hidraulica", "cat-1");

    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
      where: { slug: "hidraulica", id: { not: "cat-1" } },
    });
  });

  it("updates a category by id", async () => {
    mockPrisma.category.update.mockResolvedValue({ id: "cat-1" });
    const dto = { name: "Elétrica Atualizada" };

    await repository.updateCategory("cat-1", dto);

    expect(mockPrisma.category.update).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      data: dto,
    });
  });

  it("deletes a category by id", async () => {
    mockPrisma.category.delete.mockResolvedValue({ id: "cat-1" });

    await repository.deleteCategory("cat-1");

    expect(mockPrisma.category.delete).toHaveBeenCalledWith({
      where: { id: "cat-1" },
    });
  });
});
