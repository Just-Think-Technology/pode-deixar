// Storage service — S3-compatible (SeaweedFS) with MinIO fallback envs
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const STORAGE_OPTIONS = "STORAGE_OPTIONS";
export const MINIO_STORAGE_OPTIONS = STORAGE_OPTIONS;

export interface StorageOptions {
  bucketEnvVar: string;
  defaultBucket: string;
}

export type MinioStorageOptions = StorageOptions;
export type MinioModuleOptions = StorageOptions & { global?: boolean };

@Injectable()
export class StorageService implements OnModuleInit {
  private client!: S3Client;
  private presignClient?: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private accessKey!: string;
  private secretKey!: string;
  private region!: string;
  private useSSL!: boolean;

  constructor(
    private configService: ConfigService,
    @Inject(STORAGE_OPTIONS) options: StorageOptions,
  ) {
    const legacyBucketEnvVar = options.bucketEnvVar.startsWith("STORAGE_")
      ? options.bucketEnvVar.replace(/^STORAGE_/, "MINIO_")
      : options.bucketEnvVar.startsWith("MINIO_")
        ? options.bucketEnvVar.replace(/^MINIO_/, "STORAGE_")
        : `STORAGE_${options.bucketEnvVar}`;
    // Additional generic fallbacks for historic MINIO_BUCKET / STORAGE_BUCKET
    const genericFallbacks = ["MINIO_BUCKET", "STORAGE_BUCKET"].filter(
      (v) => v !== options.bucketEnvVar && v !== legacyBucketEnvVar,
    );
    this.bucket =
      this.configService.get<string>(options.bucketEnvVar) ||
      this.configService.get<string>(legacyBucketEnvVar) ||
      (genericFallbacks
        .map((k) => this.configService.get<string>(k))
        .find((v) => Boolean(v)) as string | undefined) ||
      options.defaultBucket;
    this.publicUrl =
      this.configService.get<string>("STORAGE_PUBLIC_URL") ||
      this.configService.get<string>("MINIO_PUBLIC_URL") ||
      "http://localhost:8080/api/storage";
  }

  // --- Public API ---

  async onModuleInit() {
    const endpoint =
      this.configService.get<string>("STORAGE_ENDPOINT") ||
      this.configService.get<string>("MINIO_ENDPOINT") ||
      "localhost";
    const portRaw =
      this.configService.get<string>("STORAGE_PORT") ||
      this.configService.get<string>("MINIO_PORT");
    const port = portRaw ? Number(portRaw) : 8333;
    this.accessKey =
      this.configService.get<string>("STORAGE_ACCESS_KEY") ||
      this.configService.get<string>("MINIO_ACCESS_KEY") ||
      "seaweedfs";
    this.secretKey =
      this.configService.get<string>("STORAGE_SECRET_KEY") ||
      this.configService.get<string>("MINIO_SECRET_KEY") ||
      "seaweedfs";
    this.region =
      this.configService.get<string>("STORAGE_REGION") || "us-east-1";
    const useSSLRaw =
      this.configService.get<string>("STORAGE_USE_SSL") ||
      this.configService.get<string>("MINIO_USE_SSL");
    this.useSSL = useSSLRaw === "true" || useSSLRaw === "1";

    const protocol = this.useSSL ? "https" : "http";
    const s3Endpoint = `${protocol}://${endpoint}:${port}`;

    this.client = new S3Client({
      region: this.region,
      endpoint: s3Endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
      },
    });

    // Ensure bucket exists (idempotent)
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch {
        // Best effort — bucket may already exist or SeaweedFS auto-creates on PUT
      }
    }
  }

  async uploadFile(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    bucket?: string,
  ): Promise<string> {
    const targetBucket = bucket || this.bucket;
    await this.client.send(
      new PutObjectCommand({
        Bucket: targetBucket,
        Key: fileName,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return `${this.publicUrl.replace(/\/$/, "")}/${targetBucket}/${fileName}`;
  }

  async deleteFile(fileName: string, bucket?: string): Promise<void> {
    const targetBucket = bucket || this.bucket;
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: fileName,
      }),
    );
  }

  // Temporary read URL (bucket is not public): 15-minute default
  async generateTemporaryUrl(
    fileName: string,
    bucket?: string,
    expiresInSeconds = 15 * 60,
  ): Promise<string> {
    const targetBucket = bucket || this.bucket;
    const presign = this.getPresignClient();
    const signed = await getSignedUrl(
      presign,
      new GetObjectCommand({
        Bucket: targetBucket,
        Key: fileName,
      }),
      { expiresIn: expiresInSeconds },
    );
    // Re-attach gateway prefix (/api/storage): Caddy strips it before proxying
    try {
      const u = new URL(signed);
      const base = this.publicUrl.replace(/\/$/, "");
      return `${base}${u.pathname}${u.search}`;
    } catch {
      return signed;
    }
  }

  // --- Private Helpers ---

  private getPresignClient(): S3Client {
    if (this.presignClient) return this.presignClient;
    try {
      const base = new URL(this.publicUrl);
      const ssl = base.protocol === "https:";
      const host = base.hostname;
      const port = base.port ? Number(base.port) : ssl ? 443 : 80;
      const protocol = ssl ? "https" : "http";
      // For presigning, endpoint is the public origin without the /api/storage path,
      // so the signature is valid when fetched via the gateway.
      const endpoint = `${protocol}://${host}:${port}`;
      this.presignClient = new S3Client({
        region: this.region,
        endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: this.accessKey,
          secretAccessKey: this.secretKey,
        },
      });
      return this.presignClient;
    } catch {
      return this.client;
    }
  }

  extractFileName(url: string, bucket?: string): string {
    const targetBucket = bucket || this.bucket;
    const parts = url.split(`/${targetBucket}/`);
    return parts[parts.length - 1];
  }
}

// Aliases for backward compatibility
export const MinioService = StorageService;
export type MinioService = StorageService;
