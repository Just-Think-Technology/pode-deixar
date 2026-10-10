// Storage barrel — S3-compatible object storage (public package exports)

export { StorageModule, STORAGE_OPTIONS } from "./src/storage.module";
export { StorageService } from "./src/storage.service";
export type { StorageModuleOptions } from "./src/storage.module";
export type { StorageOptions } from "./src/storage.service";
export {
  ALLOWED_IMAGE_MIMES,
  DEFAULT_IMAGE_MAX_SIZE,
  createImageFileInterceptor,
} from "./src/image-upload.interceptor";
export type { ImageUploadOptions } from "./src/image-upload.interceptor";
export {
  ImagePipeline,
  SHARP_PIXEL_LIMIT,
  WEBP_QUALITY,
} from "./src/image-pipeline.service";
export type { ImagePipelinePort } from "./src/image-pipeline.service";
