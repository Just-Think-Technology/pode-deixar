// Categories module — service category wiring

import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import {
  CategoriesController,
  AdminCategoriesController,
} from "./categories.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

@Module({

  // --- Imports ---

  imports: [PrismaModule, SharedModule],

  // --- Controllers ---

  controllers: [CategoriesController, AdminCategoriesController],

  // --- Providers ---

  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
