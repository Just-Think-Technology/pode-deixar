// Storage module — S3-compatible object storage wiring
// Reads STORAGE_* env vars (see .agents/decisions/storage-env-names.md)

import { StorageModule } from "@pode-deixar/storage";

export const ServiceStorageModule = StorageModule.register({
  bucketEnvVar: "STORAGE_SERVICE_IMAGES_BUCKET",
  defaultBucket: "service-images",
  global: true,
});
