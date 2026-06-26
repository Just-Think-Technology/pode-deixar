import { Module } from "@nestjs/common";
import { ProviderServicesService } from "./provider-services.service";
import { ProviderServicesController } from "./provider-services.controller";
import { PublicProviderServicesController } from "./provider-services.controller";
import { ProviderServiceDetailController } from "./provider-services.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [
    ProviderServicesController,
    PublicProviderServicesController,
    ProviderServiceDetailController,
  ],
  providers: [ProviderServicesService],
  exports: [ProviderServicesService],
})
export class ProviderServicesModule {}
