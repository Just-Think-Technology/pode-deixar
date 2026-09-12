import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CategoriesRepository } from "./categories.repository";
import {
  CategoriesController,
  AdminCategoriesController,
} from "./categories.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService],
})
export class CategoriesModule {}
