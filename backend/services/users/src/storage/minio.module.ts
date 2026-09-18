// Storage module — S3-compatible object storage wiring (SeaweedFS)
// Supports STORAGE_* env vars with MINIO_* fallback for backward compatibility

import { StorageModule } from "@pode-deixar/storage";
import { MinioStorageModule } from "@pode-deixar/storage";

export const MinioModule = (StorageModule ?? MinioStorageModule).register({
  bucketEnvVar: "STORAGE_SERVICE_IMAGES_BUCKET",
  defaultBucket: "service-images",
  global: true,
});
