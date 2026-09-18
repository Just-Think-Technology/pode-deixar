export {
  MINIO_STORAGE_OPTIONS,
  MinioService,
} from "./src/minio.service";
export { STORAGE_OPTIONS, StorageService } from "./src/storage.service";
export type { MinioStorageOptions, MinioModuleOptions } from "./src/minio.service";
export type { StorageOptions, MinioModuleOptions as StorageModuleOptions } from "./src/storage.service";
export { MinioStorageModule, StorageModule } from "./src/minio-storage.module";
export type { StorageModuleOptions as StorageModuleOptionsAlias } from "./src/minio-storage.module";
export {
  ALLOWED_IMAGE_MIMES,
  DEFAULT_IMAGE_MAX_SIZE,
  createImageFileInterceptor,
} from "./src/image-upload.interceptor";
export type { ImageUploadOptions } from "./src/image-upload.interceptor";
