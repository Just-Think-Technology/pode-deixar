import { DynamicModule, Module } from "@nestjs/common";
import {
  STORAGE_OPTIONS,
  StorageService,
  StorageOptions,
} from "./storage.service";

export type MinioStorageOptions = StorageOptions;
export interface MinioModuleOptions extends StorageOptions {
  global?: boolean;
}

@Module({})
export class MinioStorageModule {
  static register(options: MinioModuleOptions): DynamicModule {
    return {
      module: MinioStorageModule,
      global: options.global ?? false,
      providers: [
        { provide: STORAGE_OPTIONS, useValue: options },
        StorageService,
      ],
      exports: [StorageService],
    };
  }
}

// New naming (preferred)
export const StorageModule = MinioStorageModule;
export type StorageModuleOptions = MinioModuleOptions;
export { STORAGE_OPTIONS };
