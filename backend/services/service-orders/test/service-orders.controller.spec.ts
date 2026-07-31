import { Test, TestingModule } from "@nestjs/testing";
import { MyServiceOrdersController } from "../src/service-orders/service-orders.controller";
import { PublicServiceOrdersController } from "../src/service-orders/service-orders.controller";
import { ServiceOrdersService } from "../src/service-orders/service-orders.service";

describe("MyServiceOrdersController", () => {
  let controller: MyServiceOrdersController;

  const mockServiceOrdersService = {
    findByIdForClient: jest.fn(),
    findByIdWithAccess: jest.fn(),
  };

  const mockRequest = (overrides = {}) => ({
    user: { sub: "client-1", email: "client@test.com", role: "CLIENT" },
    ip: "127.0.0.1",
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MyServiceOrdersController],
      providers: [
        { provide: ServiceOrdersService, useValue: mockServiceOrdersService },
      ],
    }).compile();

    controller = module.get<MyServiceOrdersController>(MyServiceOrdersController);
    jest.clearAllMocks();
  });

  describe("findOne", () => {
    it("should call service.findByIdForClient with userId and orderId", async () => {
      const req = mockRequest();
      const expectedOrder = { id: "order-1", client_id: "client-1" };

      mockServiceOrdersService.findByIdForClient.mockResolvedValue(expectedOrder);

      const result = await controller.findOne(req, "order-1");

      expect(mockServiceOrdersService.findByIdForClient).toHaveBeenCalledWith(
        "order-1",
        "client-1",
      );
      expect(result).toEqual(expectedOrder);
    });
  });
});

describe("PublicServiceOrdersController", () => {
  let controller: PublicServiceOrdersController;

  const mockServiceOrdersService = {
    findByIdWithAccess: jest.fn(),
  };

  const mockRequest = (overrides = {}) => ({
    user: { sub: "client-1", email: "client@test.com", role: "CLIENT" },
    ip: "127.0.0.1",
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicServiceOrdersController],
      providers: [
        { provide: ServiceOrdersService, useValue: mockServiceOrdersService },
      ],
    }).compile();

    controller = module.get<PublicServiceOrdersController>(
      PublicServiceOrdersController,
    );
    jest.clearAllMocks();
  });

  describe("findOnePublic", () => {
    it("should call service.findByIdWithAccess with userId, role and orderId", async () => {
      const req = mockRequest();
      const expectedOrder = { id: "order-1", proposals: [] };

      mockServiceOrdersService.findByIdWithAccess.mockResolvedValue(
        expectedOrder,
      );

      const result = await controller.findOnePublic(req, "order-1");

      expect(
        mockServiceOrdersService.findByIdWithAccess,
      ).toHaveBeenCalledWith("order-1", "client-1", "CLIENT");
      expect(result).toEqual(expectedOrder);
    });

    it("should pass PROVIDER role correctly", async () => {
      const req = mockRequest({
        user: { sub: "provider-1", role: "PROVIDER" },
      });
      const expectedOrder = {
        id: "order-1",
        proposals: [{ provider_id: "provider-1" }],
      };

      mockServiceOrdersService.findByIdWithAccess.mockResolvedValue(
        expectedOrder,
      );

      const result = await controller.findOnePublic(req, "order-1");

      expect(
        mockServiceOrdersService.findByIdWithAccess,
      ).toHaveBeenCalledWith("order-1", "provider-1", "PROVIDER");
      expect(result.proposals).toHaveLength(1);
    });
  });
});
