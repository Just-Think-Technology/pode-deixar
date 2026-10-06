// Storage service — S3-compatible object storage
//
// STORAGE_* is the standard for every variable. MINIO_* is still accepted as a
// deprecated alias because the real .env.staging / .env.production files on the
// hosts still carry it; drop the fallback in a follow-up once those files are
// migrated (tracked in .agents/decisions/storage-env-names.md).
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

export interface StorageOptions {
  bucketEnvVar: string;
  defaultBucket: string;
}

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
    this.bucket = this.read(options.bucketEnvVar) || options.defaultBucket;
    this.publicUrl =
      this.read("STORAGE_PUBLIC_URL") || "http://localhost:8080/api/storage";
  }

  // --- Public API ---

  /**
   * Reads a variable by its standard STORAGE_* name, falling back to the
   * historic MINIO_* name. See the deprecation note at the top of the file.
   */
  private read(envVar: string): string | undefined {
    const value = this.configService.get<string>(envVar);
    if (value) {
      return value;
    }

    const legacy = envVar.startsWith("STORAGE_")
      ? envVar.replace(/^STORAGE_/, "MINIO_")
      : envVar.startsWith("MINIO_")
        ? envVar.replace(/^MINIO_/, "STORAGE_")
        : `STORAGE_${envVar}`;

    return this.configService.get<string>(legacy);
  }

  async onModuleInit() {
    const endpoint = this.read("STORAGE_ENDPOINT") || "localhost";
    const portRaw = this.read("STORAGE_PORT");
    const port = portRaw ? Number(portRaw) : 8333;
    this.accessKey = this.read("STORAGE_ACCESS_KEY") || "seaweedfs";
    this.secretKey = this.read("STORAGE_SECRET_KEY") || "seaweedfs";
    this.region = this.read("STORAGE_REGION") || "us-east-1";
    const useSSLRaw = this.read("STORAGE_USE_SSL");
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
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
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
