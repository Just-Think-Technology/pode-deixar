import { ConfigService } from "@nestjs/config";
import { MinioService } from "../src/minio.service";
import { StorageService } from "../src/storage.service";
import { createImageFileInterceptor } from "../src/image-upload.interceptor";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(async () =>
    "http://seaweedfs:8333/order-photos/f.webp?X-Amz-Signature=abc",
  ),
}));

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

  it("uploads and deletes through the S3 client", async () => {
    const svc = service();
    const send = jest.fn().mockResolvedValue(undefined);
    (svc as unknown as { client: { send: typeof send } }).client = { send } as unknown as never;

    const url = await svc.uploadFile("a.webp", Buffer.from("x"), "image/webp");
    expect(send).toHaveBeenCalledTimes(1);
    const putCmd = send.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(putCmd.input.Bucket).toBe("service-images");
    expect(putCmd.input.Key).toBe("a.webp");
    expect(putCmd.input.ContentType).toBe("image/webp");
    expect(url).toContain("/service-images/a.webp");

    send.mockClear();
    await svc.deleteFile("a.webp");
    expect(send).toHaveBeenCalledTimes(1);
    const delCmd = send.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(delCmd.input.Bucket).toBe("service-images");
    expect(delCmd.input.Key).toBe("a.webp");
  });

  it("signs temporary urls through the gateway prefix", async () => {
    const svc = service();
    (svc as unknown as { client: unknown }).client = {};
    // Force presignClient creation to fallback to mocked getSignedUrl
    (svc as unknown as { publicUrl: string }).publicUrl = "http://localhost:8080/api/storage";

    const url = await svc.generateTemporaryUrl("f.webp", "order-photos");
    expect(url).toContain("/api/storage/order-photos/f.webp");
    expect(url).toContain("X-Amz-Signature=abc");
  });
});

describe("StorageService (SeaweedFS alias)", () => {
  it("falls back to STORAGE_* and MINIO_* bucket env vars", () => {
    const cfg = {
      get: (k: string) => (k === "STORAGE_AVATARS_BUCKET" ? "custom-avatars" : undefined),
    } as unknown as ConfigService;
    const svc = new StorageService(cfg, {
      bucketEnvVar: "STORAGE_AVATARS_BUCKET",
      defaultBucket: "avatars",
    });
    expect((svc as unknown as { bucket: string }).bucket).toBe("custom-avatars");
  });

  it("is aliased as MinioService", () => {
    expect(MinioService).toBe(StorageService);
  });
});

describe("createImageFileInterceptor", () => {
  it("returns an interceptor class", () => {
    const Interceptor = createImageFileInterceptor();
    expect(typeof Interceptor).toBe("function");
  });
});
