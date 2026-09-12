import { ConfigService } from "@nestjs/config";
import { MinioService } from "../src/minio.service";
import { createImageFileInterceptor } from "../src/image-upload.interceptor";

const config = { get: (_key: string) => undefined } as unknown as ConfigService;

function service() {
  return new MinioService(config, {
    bucketEnvVar: "MINIO_BUCKET",
    defaultBucket: "service-images",
  });
}

describe("MinioService", () => {
  it("falls back to the configured default bucket", () => {
    const svc = new MinioService(config, {
      bucketEnvVar: "MINIO_BUCKET",
      defaultBucket: "service-images",
    });
    expect(
      svc.extractFileName("http://localhost:8080/api/storage/service-images/a.webp"),
    ).toBe("a.webp");
  });

  it("uploads and deletes through the client", async () => {
    const svc = service();
    const putObject = jest.fn().mockResolvedValue(undefined);
    const removeObject = jest.fn().mockResolvedValue(undefined);
    (svc as unknown as { client: unknown }).client = {
      putObject,
      removeObject,
    };

    const url = await svc.uploadFile("a.webp", Buffer.from("x"), "image/webp");
    expect(putObject).toHaveBeenCalledWith(
      "service-images",
      "a.webp",
      expect.any(Buffer),
      1,
      { "Content-Type": "image/webp" },
    );
    expect(url).toContain("/service-images/a.webp");

    await svc.deleteFile("a.webp");
    expect(removeObject).toHaveBeenCalledWith("service-images", "a.webp");
  });

  it("signs temporary urls through the gateway prefix", async () => {
    const svc = service();
    (svc as unknown as { client: unknown }).client = {};
    (svc as unknown as { presignClient: unknown }).presignClient = {
      presignedGetObject: jest
        .fn()
        .mockResolvedValue(
          "http://minio:9000/order-photos/f.webp?X-Amz-Signature=abc",
        ),
    };

    const url = await svc.generateTemporaryUrl("f.webp", "order-photos");
    expect(url).toContain("/api/storage/order-photos/f.webp");
    expect(url).toContain("X-Amz-Signature=abc");
  });
});

describe("createImageFileInterceptor", () => {
  it("returns an interceptor class", () => {
    const Interceptor = createImageFileInterceptor();
    expect(typeof Interceptor).toBe("function");
  });
});
