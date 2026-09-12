import { BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const DEFAULT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        "Formato de imagem inválido. Permitidos: JPEG, PNG, WebP, GIF",
      ),
      false,
    );
  }
}

export interface ImageUploadOptions {
  field?: string;
  maxFileSizeBytes?: number;
}

// Single-file image upload: in-memory buffer, shared size cap and mime
// allowlist. Multi-file endpoints with their own quotas keep FilesInterceptor.
export function createImageFileInterceptor(options: ImageUploadOptions = {}) {
  return FileInterceptor(options.field ?? "file", {
    storage: memoryStorage(),
    limits: { fileSize: options.maxFileSizeBytes ?? DEFAULT_IMAGE_MAX_SIZE },
    fileFilter: imageFileFilter,
  });
}
