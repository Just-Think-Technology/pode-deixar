// Provider services module — offered service catalog wiring

import { Module } from "@nestjs/common";
import { ProviderServicesService } from "./provider-services.service";
import {
  ProviderServicesController,
  PublicProviderServicesController,
  ProviderServiceDetailController,
  ProviderSearchController,
} from "./provider-services.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

import { ProviderServicesRepository } from "./provider-services.repository";

@Module({
  // --- Imports ---

  imports: [PrismaModule, SharedModule],

  // --- Controllers ---

  controllers: [
    ProviderServicesController,
    PublicProviderServicesController,
    ProviderServiceDetailController,
    ProviderSearchController,
  ],

  // --- Providers ---

  providers: [ProviderServicesService, ProviderServicesRepository],
  exports: [ProviderServicesService],
})
export class ProviderServicesModule {}
