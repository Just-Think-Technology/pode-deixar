import { DynamicModule, Module } from "@nestjs/common";
import {
  MINIO_STORAGE_OPTIONS,
  MinioService,
  MinioStorageOptions,
} from "./minio.service";

export interface MinioModuleOptions extends MinioStorageOptions {
  global?: boolean;
}

@Module({})
export class MinioStorageModule {
  static register(options: MinioModuleOptions): DynamicModule {
    return {
      module: MinioStorageModule,
      global: options.global ?? false,
      providers: [
        { provide: MINIO_STORAGE_OPTIONS, useValue: options },
        MinioService,
      ],
      exports: [MinioService],
    };
  }
}
