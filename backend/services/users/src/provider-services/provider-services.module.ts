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
  imports: [PrismaModule, SharedModule],
  controllers: [
    ProviderServicesController,
    PublicProviderServicesController,
    ProviderServiceDetailController,
    ProviderSearchController,
  ],
  providers: [ProviderServicesService],
  exports: [ProviderServicesService],
})
export class ProviderServicesModule {}
