import { Module } from "@nestjs/common";
import { ProviderServicesService } from "./provider-services.service";
import { ProviderServicesRepository } from "./provider-services.repository";
import {
  ProviderServicesController,
  PublicProviderServicesController,
  ProviderServiceDetailController,
  ProviderSearchController,
} from "./provider-services.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [
    ProviderServicesController,
    PublicProviderServicesController,
    ProviderServiceDetailController,
    ProviderSearchController,
  ],
  providers: [ProviderServicesService, ProviderServicesRepository],
  exports: [ProviderServicesService],
})
export class ProviderServicesModule {}
