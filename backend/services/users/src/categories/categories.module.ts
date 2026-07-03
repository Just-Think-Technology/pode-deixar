import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CategoriesController, AdminCategoriesController } from "./categories.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
