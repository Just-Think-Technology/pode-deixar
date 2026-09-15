// Prisma module — global database client wiring

import { Module, Global } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({

  // --- Providers ---

  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
