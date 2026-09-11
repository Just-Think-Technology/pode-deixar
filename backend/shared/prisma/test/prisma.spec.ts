import { PrismaService } from "../src/prisma.service";
import { PrismaModule } from "../src/prisma.module";

describe("PrismaService", () => {
  it("instantiates without connecting", () => {
    const service = new PrismaService();
    expect(service).toBeInstanceOf(PrismaService);
    expect(typeof service.onModuleInit).toBe("function");
    expect(typeof service.onModuleDestroy).toBe("function");
  });
});

describe("PrismaModule", () => {
  it("is defined", () => {
    expect(PrismaModule).toBeDefined();
  });
});
