import { Test, TestingModule } from "@nestjs/testing";
import { CategoriesController, AdminCategoriesController } from "../src/categories/categories.controller";
import { CategoriesService } from "../src/categories/categories.service";

describe("CategoriesController", () => {
  let controller: CategoriesController;
  let adminController: AdminCategoriesController;

  const mockCategoriesService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = (overrides = {}) => ({
    user: { sub: "admin-1", email: "admin@test.com", role: "ADMIN" },
    ip: "127.0.0.1",
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController, AdminCategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    adminController = module.get<AdminCategoriesController>(AdminCategoriesController);
    jest.clearAllMocks();
  });

  describe("CategoriesController - findAll", () => {
    it("should call service.findAll", async () => {
      const expected = [{ id: "cat-1", name: "Elétrica", slug: "eletrica" }];
      mockCategoriesService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(mockCategoriesService.findAll).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe("AdminCategoriesController - create", () => {
    it("should call service.create with dto and ip", async () => {
      const req = mockRequest();
      const dto = { name: "Teste", slug: "teste" };
      const expected = { id: "new-id", ...dto };
      mockCategoriesService.create.mockResolvedValue(expected);

      const result = await adminController.create(req, dto as any);

      expect(mockCategoriesService.create).toHaveBeenCalledWith(dto, "127.0.0.1");
      expect(result).toEqual(expected);
    });
  });

  describe("AdminCategoriesController - update", () => {
    it("should call service.update with id, dto and ip", async () => {
      const req = mockRequest();
      const dto = { name: "Atualizado" };
      const expected = { id: "cat-1", name: "Atualizado" };
      mockCategoriesService.update.mockResolvedValue(expected);

      const result = await adminController.update(req, "cat-1", dto as any);

      expect(mockCategoriesService.update).toHaveBeenCalledWith("cat-1", dto, "127.0.0.1");
      expect(result).toEqual(expected);
    });
  });

  describe("AdminCategoriesController - remove", () => {
    it("should call service.remove with id and ip", async () => {
      const req = mockRequest();
      mockCategoriesService.remove.mockResolvedValue(undefined);

      const result = await adminController.remove(req, "cat-1");

      expect(mockCategoriesService.remove).toHaveBeenCalledWith("cat-1", "127.0.0.1");
      expect(result).toEqual({ message: "Categoria excluída com sucesso" });
    });
  });
});
