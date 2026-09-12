import { MinioStorageModule } from "@pode-deixar/storage";

export const MinioModule = MinioStorageModule.register({
  bucketEnvVar: "MINIO_BUCKET",
  defaultBucket: "service-images",
  global: true,
});
