// Provider services module — offered service catalog wiring

import { Module } from "@nestjs/common";
import { ProviderServicesService } from "./provider-services.service";
import {
  ProviderServicesController,
  PublicProviderServicesController,
  ProviderServiceDetailController,
  ProviderSearchController,
} from "./provider-services.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

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

  providers: [ProviderServicesService],
  exports: [ProviderServicesService],
})
export class ProviderServicesModule {}
