// Storage module — registers the S3-compatible storage service
import { DynamicModule, Module } from "@nestjs/common";
import {
  STORAGE_OPTIONS,
  StorageService,
  StorageOptions,
} from "./storage.service";

export interface StorageModuleOptions extends StorageOptions {
  global?: boolean;
}

@Module({})
export class StorageModule {
  static register(options: StorageModuleOptions): DynamicModule {
    return {
      module: StorageModule,
      global: options.global ?? false,
      providers: [
        { provide: STORAGE_OPTIONS, useValue: options },
        StorageService,
      ],
      exports: [StorageService],
    };
  }
}

export { STORAGE_OPTIONS };
