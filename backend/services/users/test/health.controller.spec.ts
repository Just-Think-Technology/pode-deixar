import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "../src/health/health.controller";
import { HealthCheckService, HealthCheckResult } from "@nestjs/terminus";
import { DatabaseHealthIndicator } from "../src/health/database.health";

describe("HealthController", () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockDbHealthIndicator = {
    isHealthy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: DatabaseHealthIndicator, useValue: mockDbHealthIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  describe("check", () => {
    it("should return health check result when database is healthy", async () => {
      const expectedResult: HealthCheckResult = {
        status: "ok",
        info: { database: { status: "up" } },
        details: { database: { status: "up" } },
      };

      mockDbHealthIndicator.isHealthy.mockResolvedValue({
        database: { status: "up" },
      });
      mockHealthCheckService.check.mockImplementationOnce((checks) =>
        Promise.resolve(expectedResult),
      );

      const result = await controller.check();

      expect(result.status).toBe("ok");
      expect(result.details.database.status).toBe("up");
    });

    it("should return error status when database is unhealthy", async () => {
      const expectedResult: HealthCheckResult = {
        status: "error",
        info: {},
        error: { database: { status: "down", message: "Connection refused" } },
        details: { database: { status: "down", message: "Connection refused" } },
      };

      mockDbHealthIndicator.isHealthy.mockRejectedValue(
        new Error("Connection refused"),
      );
      mockHealthCheckService.check.mockImplementationOnce((checks) =>
        Promise.resolve(expectedResult),
      );

      const result = await controller.check();

      expect(result.status).toBe("error");
    });
  });

  describe("ready", () => {
    it("should return ready check result", async () => {
      const expectedResult: HealthCheckResult = {
        status: "ok",
        info: { database: { status: "up" } },
        details: { database: { status: "up" } },
      };

      mockHealthCheckService.check.mockImplementationOnce((checks) =>
        Promise.resolve(expectedResult),
      );

      const result = await controller.ready();

      expect(result.status).toBe("ok");
    });
  });

  describe("live", () => {
    it("should return ok status with timestamp", async () => {
      const result = await controller.live();

      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe("string");
    });
  });
});
