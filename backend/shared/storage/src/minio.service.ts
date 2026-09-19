// Deprecated alias — use storage.service.ts (S3-compatible, SeaweedFS)
export {
  StorageService as MinioService,
  STORAGE_OPTIONS as MINIO_STORAGE_OPTIONS,
} from "./storage.service";
export type {
  StorageOptions as MinioStorageOptions,
  MinioModuleOptions,
} from "./storage.service";
